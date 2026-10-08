import { test, expect } from "@playwright/test";

test("the destination control fits above Export and can reset a selected folder", async ({
  page,
}) => {
  await page.setViewportSize({ width: 440, height: 700 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Save location Downloads" }),
  ).toBeVisible();
  await expect(page.locator("#destination-path")).toContainText("Downloads");
  await expect(
    page.getByRole("button", { name: /Export conversation/ }),
  ).toBeInViewport();
  expect(
    await page
      .locator("#export")
      .evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight),
  ).toBe(true);
  await page.getByRole("button", { name: "Save location Downloads" }).click();
  await expect(page.locator("#destination-name")).toHaveText("Chat exports");
  await page.getByRole("button", { name: "Use Downloads" }).click();
  await expect(page.locator("#destination-name")).toHaveText("Downloads");
  await expect(
    page.getByRole("button", { name: "Use Downloads" }),
  ).toBeHidden();
});

async function customPicker(page, cancelled = false) {
  await page.goto("/extension/popup.html");
  await page.evaluate(async (cancelled) => {
    const { mount } = await import("/extension/popup.js");
    const { saveFile } = await import("/extension/save.js");
    const { fixture, identity } = await import("/tests/fixtures.js");
    // Use a real, isolated FileSystemDirectoryHandle for browser I/O checks.
    // This test-only storage API is never called by the extension.
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle("日本語 Chat exports", {
      create: true,
    });
    window.destinationTest = { directory, options: [], saves: 0, pick: 0 };
    mount({
      selectDirectory: async (options) => {
        window.destinationTest.options.push({
          startIn:
            typeof options.startIn === "string"
              ? options.startIn
              : options.startIn.name,
          mode: options.mode,
          active: navigator.userActivation.isActive,
        });
        if (cancelled && window.destinationTest.pick++ > 0)
          throw new DOMException("Cancelled", "AbortError");
        return directory;
      },
      retrieve: async () => {
        const data = fixture();
        return { data, identity: identity(data) };
      },
      confirmUnchanged: async () => {},
      save: async (blob, name, options) => {
        window.destinationTest.saves++;
        window.destinationTest.savedName = await saveFile(blob, name, options);
      },
    });
  }, cancelled);
}

test("folder cancellation keeps the previous choice and selection starts from Downloads", async ({
  page,
}) => {
  await customPicker(page, true);
  await page.getByRole("button", { name: "Save location Downloads" }).click();
  await expect(page.locator("#destination-name")).toHaveText(
    "日本語 Chat exports",
  );
  await page
    .getByRole("button", { name: "Save location 日本語 Chat exports" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Folder unchanged.");
  await expect(page.locator("#destination-name")).toHaveText(
    "日本語 Chat exports",
  );
  expect(await page.evaluate(() => window.destinationTest.options[0])).toEqual({
    startIn: "downloads",
    mode: "readwrite",
    active: true,
  });
  expect(await page.evaluate(() => window.destinationTest.saves)).toBe(0);
});

test("the folder selected in the UI receives the export and repeated saves keep both files", async ({
  page,
}) => {
  await customPicker(page);
  await page.getByRole("button", { name: "Save location Downloads" }).click();
  const filenames = [];
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: /Export conversation/ }).click();
    await expect(
      page.getByRole("heading", { name: "Export saved." }),
    ).toBeVisible();
    const result = await page.evaluate(async () => {
      const { directory, savedName } = window.destinationTest;
      const file = await directory.getFileHandle(savedName);
      return { name: savedName, content: await (await file.getFile()).text() };
    });
    expect(result.content).toContain("日本語 ☕");
    expect(result.content).toMatch(/^# Export metadata/);
    filenames.push(result.name);
    await page.getByRole("button", { name: "Export another copy" }).click();
    await expect(page.locator("#destination-name")).toHaveText(
      "日本語 Chat exports",
    );
  }
  expect(filenames[0]).not.toBe(filenames[1]);
});

test("a long folder name stays within a narrow window and supports keyboard selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/extension/popup.html");
  await page.evaluate(async () => {
    const { mount } = await import("/extension/popup.js");
    mount({
      selectDirectory: async () => ({
        kind: "directory",
        name: "日本語 Very long folder ".repeat(20),
      }),
    });
  });
  await page.getByRole("button", { name: "Save location Downloads" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#destination-name")).toContainText(
    "Very long folder",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#choose-directory")).toBeFocused();
});
