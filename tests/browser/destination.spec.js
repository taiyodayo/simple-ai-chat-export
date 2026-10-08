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
        const outcome = await saveFile(blob, name, options);
        window.destinationTest.savedName = outcome.filename;
        return outcome;
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

test("two same-origin windows serialize real folder saves before probing names", async ({
  context,
  page,
}) => {
  const second = await context.newPage();
  const folderName = `concurrent-${Date.now()}`;
  for (const window of [page, second]) {
    await window.goto("/extension/popup.html");
    await window.evaluate(async (name) => {
      const root = await navigator.storage.getDirectory();
      window.sharedDirectory = await root.getDirectoryHandle(name, {
        create: true,
      });
    }, folderName);
  }
  try {
    // Hold the actual origin-wide Web Lock so both callers are queued together.
    await page.evaluate(async () => {
      let acquired;
      const entered = new Promise((resolve) => {
        acquired = resolve;
      });
      window.holder = navigator.locks.request(
        "simple-ai-chat-export-custom-save",
        async () => {
          acquired();
          await new Promise((resolve) => {
            window.releaseSaveLock = resolve;
          });
        },
      );
      await entered;
    });
    for (const [index, window] of [page, second].entries()) {
      await window.evaluate(async (index) => {
        const { saveFile } = await import("/extension/save.js");
        window.pendingSave = saveFile(
          new Blob([`Window ${index + 1} 日本語 ☕`]),
          "Human title.md",
          { directoryHandle: window.sharedDirectory },
        );
      }, index);
    }
    await page.evaluate(() => window.releaseSaveLock());
    const results = await Promise.all(
      [page, second].map((window) => window.evaluate(() => window.pendingSave)),
    );
    expect(new Set(results.map((result) => result.filename))).toEqual(
      new Set(["Human title.md", "Human title (1).md"]),
    );
    for (const [index, result] of results.entries()) {
      expect(result.status).toBe("saved");
      const content = await page.evaluate(async (name) => {
        const handle = await window.sharedDirectory.getFileHandle(name);
        return (await handle.getFile()).text();
      }, result.filename);
      expect(content).toBe(`Window ${index + 1} 日本語 ☕`);
    }
  } finally {
    await page.evaluate(async (name) => {
      window.releaseSaveLock?.();
      await window.holder;
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(name, { recursive: true });
    }, folderName);
    await second.close();
  }
});

for (const mode of ["cancelled", "save-timeout"])
  test(`a ${mode} window queued behind a real Web Lock never touches its folder`, async ({
    context,
    page,
  }) => {
    const second = await context.newPage();
    await page.goto("/extension/popup.html");
    await second.goto("/extension/popup.html");
    try {
      await page.evaluate(async () => {
        let acquired;
        const entered = new Promise((resolve) => {
          acquired = resolve;
        });
        window.holder = navigator.locks.request(
          "simple-ai-chat-export-custom-save",
          async () => {
            acquired();
            await new Promise((resolve) => {
              window.releaseSaveLock = resolve;
            });
          },
        );
        await entered;
      });
      const result = await second.evaluate(async (mode) => {
        const { saveFile } = await import("/extension/save.js");
        const controller = new AbortController();
        window.folderCalls = 0;
        const pending = saveFile(new Blob(["Should never write"]), "Chat.md", {
          directoryHandle: {
            getFileHandle() {
              window.folderCalls++;
              throw new Error("Unexpected folder access");
            },
          },
          signal: controller.signal,
          timeout: mode === "save-timeout" ? 20 : 1000,
        });
        if (mode === "cancelled") controller.abort();
        try {
          await pending;
          return "unexpected-success";
        } catch (error) {
          return error.code;
        }
      }, mode);
      expect(result).toBe(mode);
      await page.evaluate(async () => {
        window.releaseSaveLock();
        await window.holder;
      });
      expect(await second.evaluate(() => window.folderCalls)).toBe(0);
    } finally {
      await page.evaluate(() => window.releaseSaveLock?.());
      await second.close();
    }
  });
