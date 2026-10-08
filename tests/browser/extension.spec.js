import { test, expect, chromium } from "@playwright/test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fixture } from "../fixtures.js";

test("the extracted package loads with its CSP and saves readable TXT and Markdown files", async () => {
  const temporary = await mkdtemp(
    join(tmpdir(), "simple-chatgpt-export-test-"),
  );
  let context;
  try {
    const extension = join(temporary, "extension");
    execFileSync("python3", [
      "-c",
      "import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
      resolve("dist/simple-chatgpt-export-0.1.0-prototype.zip"),
      extension,
    ]);
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
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.getByRole("button", { name: /Export conversation/ }).click();
    await expect(
      page.getByRole("heading", { name: "Open a ChatGPT conversation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buy me a coffee" }),
    ).toBeHidden();
    for (const format of ["txt", "md"]) {
      const result = await page.evaluate(
        async ({ data, format }) => {
          const { validateConversation, createExport } =
            await import("./core.js");
          const { saveFile } = await import("./save.js");
          const conversation = validateConversation(data, {
            id: data.id,
            selectedNode: data.selectedNode,
          });
          const output = createExport(conversation, format);
          const blob = new Blob([output.content], { type: output.mimeType });
          let requestedFilename;
          const downloads = {
            onChanged: chrome.downloads.onChanged,
            search: (query) => chrome.downloads.search(query),
            cancel: (id) => chrome.downloads.cancel(id),
            // Native OS dialogue requires manual testing; use the real save lifecycle here.
            download: (options) => {
              requestedFilename = options.filename;
              return chrome.downloads.download({ ...options, saveAs: false });
            },
          };
          const id = await saveFile(blob, output.filename, { downloads });
          const [item] = await chrome.downloads.search({ id });
          return {
            state: item.state,
            filename: item.filename,
            requestedFilename,
            expected: output.content,
          };
        },
        { data: fixture(), format },
      );
      expect(result.state).toBe("complete");
      // Playwright stores downloads under temporary UUIDs, independent of the
      // filename supplied to Chrome for the user's save dialogue.
      expect(result.requestedFilename).toMatch(new RegExp(`\\.${format}$`));
      const content = await readFile(result.filename, "utf8");
      expect(content).toEqual(result.expected);
      expect(content).toContain("日本語 ☕");
      expect(content).toMatch(/^#? ?Export metadata/);
      await rm(result.filename, { force: true });
    }
    expect(errors).toEqual([]);
    await page.getByRole("link", { name: "Help & privacy" }).click();
    await expect(
      page.getByRole("heading", { name: "Your privacy" }),
    ).toBeVisible();
  } finally {
    await context?.close();
    await rm(temporary, { recursive: true, force: true });
  }
});
