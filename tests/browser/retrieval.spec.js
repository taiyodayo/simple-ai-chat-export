import { test, expect } from "@playwright/test";
import { readConversationPage } from "../../extension/page-reader.js";
const id = "11111111-1111-4111-8111-111111111111";
async function chat(page, guest = true, extra = "") {
  const url = `https://chatgpt.com/${guest ? "uc" : "c"}/${id}`;
  await page.route("https://chatgpt.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<title>Test chat</title><main><ol data-conversation-transcript>
 <li ${guest ? 'data-message-role="user" id="user-1"' : 'data-message-author-role="user" data-message-id="user-1"'}><div ${guest ? "data-user-message-copy" : 'class="whitespace-pre-wrap"'}>日本語 ☕</div></li>
 <li ${guest ? 'data-message-role="assistant" id="answer-1" data-message-complete' : 'data-message-author-role="assistant" data-message-id="answer-1"'}><div ${guest ? "data-assistant-markdown" : 'class="markdown"'}><p>Hello</p><pre><code>  first\n\n\n  second</code></pre><table><tr><th>Item</th><th>Count</th></tr><tr><td>Tea</td><td>2</td></tr></table><a href="https://example.org/source">Source</a></div><aside>DO NOT EXPORT THIS AD</aside></li></ol>${extra}</main>`,
    }),
  );
  await page.goto(url);
  return url;
}
for (const guest of [true, false])
  test(`${guest ? "guest" : "signed-in"} rendered transcript extraction preserves content and excludes ads`, async ({
    page,
  }) => {
    const url = await chat(page, guest);
    const result = await page.evaluate(readConversationPage, url);
    expect(result.error).toBeUndefined();
    expect(result.messages).toHaveLength(2);
    const text = result.messages[1].parts[0].text;
    expect(text).toContain("  first\n\n\n  second");
    expect(text).toContain("| ` Tea ` | ` 2 ` |");
    expect(text).not.toContain("DO NOT EXPORT");
    expect(result.messages[1].sources[0].url).toBe(
      "https://example.org/source",
    );
  });
test("generation and changing messages stop extraction", async ({ page }) => {
  const url = await chat(
    page,
    true,
    '<button aria-label="Stop generating">Stop</button>',
  );
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "generating",
  );
  await page.evaluate(() => {
    document.querySelector("button").remove();
    setTimeout(
      () =>
        (document.querySelector("[data-user-message-copy]").textContent =
          "Changed"),
      100,
    );
  });
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "changed",
  );
});
test("virtualised messages are rejected instead of silently dropped", async ({
  page,
}) => {
  const url = await chat(page);
  await page.evaluate(() =>
    setTimeout(
      () => document.querySelector('[data-message-role="user"]').remove(),
      100,
    ),
  );
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "incomplete",
  );
});

for (const provider of ["ChatGPT", "Claude", "Gemini"])
  test(`${provider}: Chrome scripting reads, revalidates and downloads both formats`, async () => {
    const { chromium } = await import("@playwright/test");
    const { mkdtemp, cp, readFile, writeFile, rm } =
      await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join, resolve } = await import("node:path");
    const temporary = await mkdtemp(join(tmpdir(), "export-injection-"));
    let context;
    try {
      const extension = join(temporary, "extension");
      await cp(resolve("extension"), extension, { recursive: true });
      const manifestPath = join(extension, "manifest.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      // Test-only access replaces a physical toolbar click's activeTab grant.
      // The shipped manifest has no host permissions.
      const origin =
        provider === "Claude"
          ? "https://claude.ai"
          : provider === "Gemini"
            ? "https://gemini.google.com"
            : "https://chatgpt.com";
      manifest.host_permissions = [`${origin}/*`];
      await writeFile(manifestPath, JSON.stringify(manifest));
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
      if (provider === "ChatGPT") await chat(target);
      else {
        const url = `${origin}/${provider === "Claude" ? `chat/${id}` : "app/0123456789abcdef"}`;
        const body =
          provider === "Claude"
            ? '<div data-testid="user-message"><div style="display:contents"><p>日本語 ☕</p></div></div><div data-testid="assistant-message" data-turn-key="answer-1" data-is-streaming="false"><div class="standard-markdown"><p>Saved answer</p></div></div>'
            : '<user-query><div class="query-text">日本語 ☕</div></user-query><model-response><message-content><div class="markdown" aria-busy="false"><p>Saved answer</p></div></message-content></model-response>';
        await target.route(origin + "/**", (route) =>
          route.fulfill({
            contentType: "text/html; charset=utf-8",
            body: `<title>Provider chat</title><main>${body}</main>`,
          }),
        );
        await target.goto(url);
      }
      const popup = await context.newPage();
      await popup.goto(
        `chrome-extension://${new URL(worker.url()).host}/popup.html`,
      );
      await expect(popup.locator('input[value="txt"]')).toBeChecked();
      const output = await popup.evaluate(
        async ({ origin, provider }) => {
          const { retrieveCurrentConversation, confirmConversationUnchanged } =
            await import("./retrieval.js");
          const { validateConversation, createExport } =
            await import("./core.js");
          const [tab] = await chrome.tabs.query({ url: `${origin}/*` });
          const { data, identity } = await retrieveCurrentConversation(tab);
          await confirmConversationUnchanged(tab.id, identity);
          const conversation = validateConversation(data, identity);
          const files = [];
          for (const format of ["txt", "md"]) {
            const result = createExport(conversation, format);
            if (result.metadata.provider !== provider)
              throw new Error("Incorrect speaker");
            files.push({
              filename: result.filename,
              mimeType: result.mimeType,
              expected: result.content,
            });
          }
          return files;
        },
        { origin, provider },
      );
      for (const file of output) {
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
        expect(await readFile(await download.path(), "utf8")).toBe(
          file.expected,
        );
        expect(file.expected).toContain("日本語 ☕");
        await download.delete();
      }
    } finally {
      await context?.close();
      await rm(temporary, { recursive: true, force: true });
    }
  });

for (const guest of [true, false])
  test(`message layout is detected independently of ${guest ? "history" : "guest"} URL`, async ({
    page,
  }) => {
    await chat(page, guest);
    const url = `https://chatgpt.com/${guest ? "c" : "uc"}/${id}`;
    await page.evaluate((url) => history.replaceState(null, "", url), url);
    const result = await page.evaluate(readConversationPage, url);
    expect(result.error).toBeUndefined();
    expect(result.messages).toHaveLength(2);
  });
test("history messages that mount after navigation are read", async ({
  page,
}) => {
  const url = await chat(page);
  await page.evaluate(() => {
    const transcript = document.querySelector("ol");
    transcript.remove();
    setTimeout(() => document.querySelector("main").append(transcript), 500);
  });
  const result = await page.evaluate(readConversationPage, url);
  expect(result.error).toBeUndefined();
  expect(result.messages).toHaveLength(2);
});
test("an unrecognised layout does not claim that a conversation is empty", async ({
  page,
}) => {
  const url = await chat(page);
  await page.evaluate(() => document.querySelector("ol").remove());
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "layout-unrecognized",
  );
});

test("current history layout exports selected messages and handles reverse scrolling", async ({
  page,
}) => {
  const url = `https://chatgpt.com/c/${id}`;
  await page.route("https://chatgpt.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<title>History chat</title><div style="height:200px;overflow-y:auto;display:flex;flex-direction:column-reverse" data-app-action-timeline-scroll><div style="flex-shrink:0" data-thread-user-message-navigation-content><div data-talvt-turn-state="complete"><div data-chatgpt-search-message-ids="user-1"><div data-user-message-bubble>日本語 ☕</div></div><div data-chatgpt-search-message-ids="reasoning-1 final-1"><h4 data-conversation-role="assistant">Assistant</h4><div data-chatgpt-selection-message-id="final-1" data-chatgpt-selection-conversation-id="${id}"><div data-markdown-text-style><p>Selected answer</p><div data-markdown-copy="code-block"><div data-markdown-copy="exclude">COPY TOOLBAR</div><div><code>  keep indentation</code></div></div><p style="height:800px">End</p></div></div></div></div></div></div>`,
    }),
  );
  await page.goto(url);
  const result = await page.evaluate(readConversationPage, url);
  expect(result.error).toBeUndefined();
  expect(result.messages.map((m) => m.id)).toEqual(["user-1", "final-1"]);
  expect(result.messages[1].parts[0].text).toContain("  keep indentation");
  expect(result.messages[1].parts[0].text).not.toContain("COPY TOOLBAR");
  expect(
    await page
      .locator("[data-app-action-timeline-scroll]")
      .evaluate((e) => e.scrollTop),
  ).toBe(0);
  await page
    .locator("[data-chatgpt-selection-message-id]")
    .evaluate((e) =>
      e.setAttribute("data-chatgpt-selection-message-id", "different-branch"),
    );
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "changed",
  );
});

test("nested layout wrappers do not accumulate blank lines or alter code whitespace", async ({
  page,
}) => {
  const url = await chat(page);
  await page.locator("[data-assistant-markdown]").evaluate((e) => {
    const outer = document.createElement("div");
    const inner = document.createElement("div");
    const first = document.createElement("p");
    first.textContent = "First paragraph";
    const second = document.createElement("p");
    second.textContent = "Second paragraph";
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = "  first\n\n\n  second";
    pre.append(code);
    inner.append(first, second, pre);
    outer.append(inner);
    e.replaceChildren(outer);
  });
  const result = await page.evaluate(readConversationPage, url);
  expect(result.error).toBeUndefined();
  expect(result.messages[1].parts[0].text).toBe(
    "First paragraph\n\nSecond paragraph\n\n```\n  first\n\n\n  second\n```",
  );
});
