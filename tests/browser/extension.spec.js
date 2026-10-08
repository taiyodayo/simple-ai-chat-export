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
      resolve(
        "dist",
        JSON.parse(await readFile("dist/inventory.json", "utf8")).artifact,
      ),
      extension,
    ]);
    expect(await readFile(join(extension, "LICENSE"), "utf8")).toBe(
      await readFile(resolve("LICENSE"), "utf8"),
    );
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
      page.getByRole("heading", {
        name: "Open a ChatGPT, Claude or Gemini conversation",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buy me a coffee" }),
    ).toBeHidden();
    const runtime = await page.evaluate(() => ({
      permissions: chrome.runtime.getManifest().permissions,
      version: chrome.runtime.getManifest().version,
      csp: chrome.runtime.getManifest().content_security_policy.extension_pages,
      downloadApi: typeof chrome.downloads,
    }));
    expect(runtime.permissions).toEqual(["activeTab", "scripting"]);
    expect(runtime.version).toBe("0.2.1");
    expect(runtime.downloadApi).toBe("undefined");
    expect(runtime.csp).toContain("connect-src 'none'");
    for (const format of ["txt", "md"]) {
      const downloading = page.waitForEvent("download");
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
          const outcome = await saveFile(
            new Blob([output.content], { type: output.mimeType }),
            output.filename,
          );
          return {
            outcome,
            expected: output.content,
            filename: output.filename,
          };
        },
        { data: fixture(), format },
      );
      const download = await downloading;
      expect(result.outcome).toEqual({
        status: "download-started",
        filename: result.filename,
      });
      expect(download.suggestedFilename()).toBe(result.filename);
      expect(await download.failure()).toBeNull();
      const content = await readFile(await download.path(), "utf8");
      expect(content).toEqual(result.expected);
      expect(content).toContain("日本語 ☕");
      expect(content).toMatch(/^#? ?Export metadata/);
      await download.delete();
    }
    // Exercise the shipped mounted UI with synthetic retrieval only. Replace
    // the form to remove its earlier wrong-page listener before mounting it.
    await page.evaluate(async (data) => {
      const { mount } = await import("./popup.js");
      const { saveFile } = await import("./save.js");
      const form = document.getElementById("export-form");
      form.replaceWith(form.cloneNode(true));
      mount({
        retrieve: async () => ({
          data,
          identity: { id: data.id, selectedNode: data.selectedNode },
        }),
        confirmUnchanged: async () => {},
        save: saveFile,
      });
    }, fixture());
    const uiDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export conversation/ }).click();
    await expect(
      page.getByRole("heading", { name: "Download started" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Export saved." }),
    ).toHaveCount(0);
    await expect(page.locator("#status-body")).toContainText(
      "Open Chrome’s Downloads",
    );
    await expect(page.locator("#status-body")).toContainText(
      "Completion isn’t confirmed here",
    );
    await expect(
      page.getByRole("link", { name: "Buy me a coffee" }),
    ).toBeVisible();
    await (await uiDownload).delete();
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
