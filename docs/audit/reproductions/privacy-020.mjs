import { chromium } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
const tmp = await mkdtemp(join(tmpdir(), "simple-ai-chat-privacy-probe-"));
const extension = join(tmp, "extension");
execFileSync("python3", [
  "-c",
  "import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])",
  resolve(import.meta.dirname, "../../../dist/simple-ai-chat-export-0.2.0.zip"),
  extension,
]);
const requests = [];
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    requests.push({ method: req.method, path: req.url, body });
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end("synthetic receipt");
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/sink`;
let context;
try {
  context = await chromium.launchPersistentContext(join(tmp, "profile"), {
    channel: "chromium",
    headless: true,
    acceptDownloads: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  let worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const page = await context.newPage();
  await page.goto(
    `chrome-extension://${new URL(worker.url()).host}/popup.html`,
  );
  const result = await page.evaluate(async (url) => {
    let fetchResult;
    try {
      await fetch(url, { method: "POST", body: "SYNTHETIC_FETCH_MARKER" });
      fetchResult = "unexpected allowed";
    } catch {
      fetchResult = "blocked";
    }
    let downloadResult;
    try {
      const id = await chrome.downloads.download({
        url,
        method: "POST",
        body: "SYNTHETIC_CONVERSATION_MARKER",
        filename: "privacy-probe.txt",
        saveAs: false,
      });
      downloadResult = { allowed: true, id };
    } catch (error) {
      downloadResult = { allowed: false, error: error.message };
    }
    localStorage.setItem(
      "synthetic-privacy-probe",
      "SYNTHETIC_LOCAL_RETENTION_MARKER",
    );
    const createdTab = await chrome.tabs.create({
      url: url + "?marker=SYNTHETIC_NAVIGATION_MARKER",
      active: false,
    });
    return {
      permissions: await chrome.permissions.getAll(),
      fetchResult,
      downloadResult,
      navigationTabCreated: Number.isInteger(createdTab.id),
    };
  }, url);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.reload();
  const retained = await page.evaluate(() =>
    localStorage.getItem("synthetic-privacy-probe"),
  );
  console.log(
    JSON.stringify(
      {
        browser: context.browser()?.version(),
        result,
        localStorageAfterReload: retained,
        requests,
      },
      null,
      2,
    ),
  );
} finally {
  await context?.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(tmp, { recursive: true, force: true });
}
