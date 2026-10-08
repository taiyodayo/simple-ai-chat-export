// Development-only: capture the real extension UI using synthetic messages.
// Nothing from an authenticated browser profile is read or included.
import { chromium } from "@playwright/test";
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const temporary = await mkdtemp(join(tmpdir(), "simple-ai-chat-store-"));
const output = resolve("store/assets");
let context;
try {
  await mkdir(output, { recursive: true });
  const extension = join(temporary, "extension");
  await cp(resolve("extension"), extension, { recursive: true });
  await cp(resolve("LICENSE"), join(extension, "LICENSE"));
  const manifestPath = join(extension, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  // Test-only access substitutes for a physical activeTab toolbar click.
  // The shipped manifest does not contain required host permissions.
  manifest.host_permissions = ["https://chatgpt.com/*"];
  await writeFile(manifestPath, JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(join(temporary, "profile"), {
    channel: "chromium",
    headless: true,
    acceptDownloads: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const target = await context.newPage();
  const url = "https://chatgpt.com/c/11111111-1111-4111-8111-111111111111";
  await target.route("https://chatgpt.com/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<title>Store sample - Tea breaks</title><main><div data-message-author-role="user" data-message-id="user-1"><div class="whitespace-pre-wrap">Give me two ideas for a quiet tea break. 日本語 ☕</div></div><div data-message-author-role="assistant" data-message-id="answer-1"><div class="markdown"><p>Keep a small moment for yourself.</p><table><tr><th>Idea</th><th>Time</th></tr><tr><td>Read a page</td><td>5 minutes</td></tr><tr><td>Step outside</td><td>10 minutes</td></tr></table><pre><code>const tea = "earl grey";\n  console.log(tea);</code></pre></div></div></main>`,
    }),
  );
  await target.goto(url);
  const page = await context.newPage();
  const id = new URL(worker.url()).host;
  await page.goto(`chrome-extension://${id}/popup.html`);
  const tabId = await page.evaluate(
    async (url) => (await chrome.tabs.query({ url }))[0].id,
    url,
  );
  await page.goto(`chrome-extension://${id}/popup.html?tab=${tabId}`);
  await page.screenshot({ path: join(output, "01-export.png") });
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await page.locator("#success").waitFor({ state: "visible" });
  await page.screenshot({ path: join(output, "02-saved.png") });
  const downloads = await page.evaluate(() =>
    chrome.downloads.search({ state: "complete" }),
  );
  // This fresh, isolated profile contains only the export started above.
  const own = downloads;
  if (own.length !== 1) throw new Error("Synthetic save was not confirmed");
  const text = await readFile(own[0].filename, "utf8");
  if (!text.includes('"version": "0.2.0"') || !text.includes("日本語 ☕"))
    throw new Error("Synthetic export verification failed");
  await rm(own[0].filename, { force: true });
  await cp(resolve("extension/icon-128.png"), join(output, "icon-128.png"));
  const promo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 440;
    canvas.height = 280;
    const c = canvas.getContext("2d");
    c.fillStyle = "#284e3a";
    c.fillRect(0, 0, 440, 280);
    c.fillStyle = "#e4ece4";
    c.beginPath();
    c.roundRect(38, 68, 145, 112, 20);
    c.fill();
    c.beginPath();
    c.moveTo(65, 178);
    c.lineTo(65, 204);
    c.lineTo(94, 178);
    c.fill();
    c.strokeStyle = "#627166";
    c.lineWidth = 7;
    c.lineCap = "round";
    for (const [y, x] of [
      [99, 150],
      [123, 134],
      [147, 142],
    ]) {
      c.beginPath();
      c.moveTo(65, y);
      c.lineTo(x, y);
      c.stroke();
    }
    c.fillStyle = "#faf9f5";
    c.beginPath();
    c.roundRect(270, 42, 128, 192, 14);
    c.fill();
    c.strokeStyle = "#284e3a";
    c.lineWidth = 6;
    for (const [y, x] of [
      [92, 372],
      [120, 362],
      [148, 371],
      [176, 351],
    ]) {
      c.beginPath();
      c.moveTo(294, y);
      c.lineTo(x, y);
      c.stroke();
    }
    c.strokeStyle = "#faf9f5";
    c.lineWidth = 8;
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(205, 140);
    c.lineTo(244, 140);
    c.moveTo(230, 125);
    c.lineTo(245, 140);
    c.lineTo(230, 155);
    c.stroke();
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await writeFile(
    join(output, "promo-440x280.png"),
    Buffer.from(promo, "base64"),
  );
  console.log(
    "Created store icon, 440 × 280 promo and two 1280 × 800 screenshots. Success follows an actual synthetic export; no real chats were captured.",
  );
} finally {
  await context?.close();
  await rm(temporary, { recursive: true, force: true });
}
