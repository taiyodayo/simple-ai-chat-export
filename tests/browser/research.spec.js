import { test, expect, chromium } from "@playwright/test";
import {
  readResearchFrame,
  formatResearchReport,
} from "../../extension/research.js";
import { readConversationPage } from "../../extension/page-reader.js";
import { researchFixture, frameProps } from "../research-fixture.js";
import { mkdtemp, cp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const conversationId = "11111111-1111-4111-8111-111111111111";
const chatUrl = `https://chatgpt.com/c/${conversationId}`;
const reportUrl =
  "https://mcp-app-abcd.web-sandbox.oaiusercontent.com/?app=research";

async function reportPage(page) {
  await page.route(reportUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<main><div class="_reportPage_test_1"><h1>Research report</h1><p>Visually clipped preview</p></div></main>',
    }),
  );
  await page.goto(reportUrl);
  await page.evaluate((props) => {
    document.querySelector("h1").__reactFiber$test = {
      return: { memoizedProps: props },
    };
  }, frameProps(researchFixture()));
}

test("completed research reads the full report, not the clipped preview", async ({
  page,
}) => {
  await reportPage(page);
  const result = await page.evaluate(readResearchFrame, [reportUrl]);
  expect(formatResearchReport(result).parts[0].text).toContain("Again [1]");
  expect(
    await page.evaluate(readResearchFrame, [reportUrl + "&other=1"]),
  ).toBeNull();
  await page.evaluate(() => {
    document.querySelector(
      "h1",
    ).__reactFiber$test.return.memoizedProps.runCompletedAtMs = undefined;
  });
  expect((await page.evaluate(readResearchFrame, [reportUrl])).error).toBe(
    "generating",
  );
});

test("research changing during extraction blocks export", async ({ page }) => {
  await reportPage(page);
  await page.evaluate(() =>
    setTimeout(() => {
      document.querySelector(
        "h1",
      ).__reactFiber$test.return.memoizedProps.report += "Changed";
    }, 100),
  );
  expect((await page.evaluate(readResearchFrame, [reportUrl])).error).toBe(
    "changed",
  );
});

test("research from an unknown report renderer blocks export", async ({
  page,
}) => {
  await reportPage(page);
  await page.evaluate(() => {
    delete document.querySelector("h1").__reactFiber$test;
  });
  expect((await page.evaluate(readResearchFrame, [reportUrl])).error).toBe(
    "research-unrecognized",
  );
});

test("a research permission refusal never saves, and a later approval retries from the click", async ({
  page,
}) => {
  await page.goto("/extension/popup.html");
  await page.evaluate(async () => {
    const { mount } = await import("/extension/popup.js");
    const { ExportError } = await import("/extension/core.js");
    const { fixture } = await import("/tests/fixtures.js");
    window.researchTest = {
      allowed: false,
      requests: 0,
      saves: 0,
      clicked: false,
    };
    mount({
      retrieve: async () => {
        if (!window.researchTest.allowed) {
          const e = new ExportError("research-access");
          e.researchOrigins = [
            "https://mcp-app-abcd.web-sandbox.oaiusercontent.com/*",
          ];
          throw e;
        }
        const data = fixture();
        return {
          data,
          identity: { id: data.id, selectedNode: data.selectedNode },
        };
      },
      confirmUnchanged: async () => {},
      save: async () => {
        window.researchTest.saves++;
        return { status: "saved", filename: "synthetic.md" };
      },
      requestResearchPermission: () => {
        window.researchTest.requests++;
        window.researchTest.clicked = navigator.userActivation.isActive;
        return Promise.resolve(window.researchTest.allowed);
      },
    });
  });
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Allow access to the Deep Research report",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Allow Deep Research and export" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Deep Research access wasn’t granted" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.researchTest.saves)).toBe(0);
  await page.evaluate(() => {
    window.researchTest.allowed = true;
  });
  await page
    .getByRole("button", { name: "Allow Deep Research and export" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Export saved." }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.researchTest)).toMatchObject({
    requests: 2,
    saves: 1,
    clicked: true,
  });
});

test("Chrome injects into nested research frames, binds reports to chat order and saves both formats", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "export-research-"));
  let context;
  try {
    const extension = join(temporary, "extension");
    await cp(resolve("extension"), extension, { recursive: true });
    const path = join(extension, "manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    // Test-only grants replace Chrome's interactive activeTab and permission clicks.
    manifest.host_permissions = [
      "https://chatgpt.com/*",
      "https://mcp-app-abcd.web-sandbox.oaiusercontent.com/*",
    ];
    await writeFile(path, JSON.stringify(manifest));
    context = await chromium.launchPersistentContext(
      join(temporary, "profile"),
      {
        channel: "chromium",
        headless: true,
        acceptDownloads: true,
        args: [
          `--disable-extensions-except=${extension}`,
          `--load-extension=${extension}`,
        ],
      },
    );
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const target = await context.newPage();
    await target.route("https://chatgpt.com/**", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: `<title>Synthetic research chat</title><main><div data-talvt-turn-state="complete"><div data-chatgpt-search-message-ids="user-1"><div data-user-message-bubble>Research 日本語</div></div><div data-chatgpt-search-message-ids="report-wrapper"><div data-mcp-app-frame><iframe title="Deep research" src="${reportUrl}"></iframe></div></div><div data-chatgpt-search-message-ids="reasoning-2 final-2"><h4 data-conversation-role="assistant">Assistant</h4><div data-chatgpt-selection-conversation-id="${conversationId}"><div data-markdown-text-style><p>Follow-up answer</p></div></div></div></div></main>`,
      }),
    );
    await target.route(reportUrl, (r) =>
      r.fulfill({
        contentType: "text/html",
        body: `<iframe src="${reportUrl}&inner=1"></iframe>`,
      }),
    );
    await target.route(reportUrl + "&inner=1", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<main><div class="_reportPage_test_1"><h1>Report</h1></div></main>',
      }),
    );
    await target.goto(chatUrl);
    const frame = target
      .frames()
      .find((f) => f.url() === reportUrl + "&inner=1");
    await frame.evaluate((props) => {
      document.querySelector("h1").__reactFiber$test = {
        return: { memoizedProps: props },
      };
    }, frameProps(researchFixture()));
    const preflight = await target.evaluate(readConversationPage, chatUrl);
    expect(preflight.error).toBe("research-access");
    const popup = await context.newPage();
    await popup.goto(
      `chrome-extension://${new URL(worker.url()).host}/popup.html`,
    );
    const output = await popup.evaluate(async () => {
      const { retrieveCurrentConversation, confirmConversationUnchanged } =
        await import("./retrieval.js");
      const { validateConversation, createExport } = await import("./core.js");
      const [tab] = await chrome.tabs.query({ url: "https://chatgpt.com/*" });
      const { data, identity } = await retrieveCurrentConversation(tab);
      await confirmConversationUnchanged(tab.id, identity);
      const conversation = validateConversation(data, identity);
      const files = [];
      for (const format of ["md", "txt"]) {
        const output = createExport(conversation, format);
        files.push({
          filename: output.filename,
          mimeType: output.mimeType,
          expected: output.content,
        });
      }
      return {
        files,
        identity,
        ids: conversation.messages.map((m) => m.id),
        sources: conversation.messages[1].sources.length,
      };
    });
    expect(output.ids).toEqual([
      "user-1",
      "report-wrapper",
      "rendered-reasoning-2",
    ]);
    expect(output.sources).toBe(2);
    for (const file of output.files) {
      const [download, outcome] = await Promise.all([
        popup.waitForEvent("download"),
        popup.evaluate(async (file) => {
          const { saveFile } = await import("./save.js");
          return saveFile(
            new Blob([file.expected], { type: file.mimeType }),
            file.filename,
          );
        }, file),
      ]);
      expect(outcome.status).toBe("download-started");
      expect(await download.failure()).toBeNull();
      expect(await readFile(await download.path(), "utf8")).toBe(file.expected);
      expect(file.expected).toContain("Again [1]");
      expect(file.expected).toContain("https://example.org/research");
      expect(file.expected).toContain("Follow-up answer");
      expect(file.expected).toContain("renderedSourceMessageIds");
      await download.delete();
    }
    await frame.evaluate(() => {
      const p =
        document.querySelector("h1").__reactFiber$test.return.memoizedProps;
      p.report += "Changed";
      p.contentReferences.at(-1).start_idx = p.report.length;
      p.contentReferences.at(-1).end_idx = p.report.length;
    });
    // Verify changed report text participates in the normal fingerprint.
    const error = await popup.evaluate(async (identity) => {
      const { confirmConversationUnchanged } = await import("./retrieval.js");
      const [tab] = await chrome.tabs.query({ url: "https://chatgpt.com/*" });
      try {
        await confirmConversationUnchanged(tab.id, identity);
      } catch (e) {
        return e.code;
      }
    }, output.identity);
    expect(error).toBe("changed");
  } finally {
    await context?.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
