import test from "node:test";
import assert from "node:assert/strict";
import { saveFile } from "../extension/save.js";

function api(mode) {
  const listeners = new Set(),
    cancelled = [];
  const emit = (state) => {
    for (const l of listeners) l({ id: 42, state: { current: state } });
  };
  return {
    listeners,
    cancelled,
    onChanged: {
      addListener: (l) => listeners.add(l),
      removeListener: (l) => listeners.delete(l),
    },
    download: async (options) => {
      assert.equal(options.saveAs, false);
      if (mode === "reject") throw new Error("private browser detail");
      if (mode === "early") emit("complete");
      if (mode === "late") await new Promise((r) => setTimeout(r, 30));
      if (mode === "complete" || mode === "interrupted")
        setTimeout(() => emit(mode), 5);
      return 42;
    },
    search: async ({ id }) => {
      assert.equal(id, 42);
      return [
        { id, state: mode === "already-complete" ? "complete" : "in_progress" },
      ];
    },
    cancel: async (id) => {
      cancelled.push(id);
    },
  };
}
for (const mode of ["complete", "early", "already-complete"])
  test(`save confirms ${mode} and cleans listeners`, async () => {
    const downloads = api(mode);
    assert.equal(
      await saveFile(new Blob(["test"]), "test.txt", { downloads }),
      42,
    );
    assert.equal(downloads.listeners.size, 0);
    assert.deepEqual(downloads.cancelled, []);
  });
for (const mode of ["interrupted", "reject"])
  test(`save rejects ${mode} without leaking raw browser errors`, async () => {
    const downloads = api(mode);
    await assert.rejects(
      saveFile(new Blob(["test"]), "test.txt", { downloads }),
      { code: "save-interrupted" },
    );
    assert.equal(downloads.listeners.size, 0);
  });
test("save timeout cancels its own download", async () => {
  const downloads = api("pending");
  await assert.rejects(
    saveFile(new Blob(["test"]), "test.txt", { downloads, timeout: 5 }),
    { code: "save-timeout" },
  );
  assert(downloads.cancelled.includes(42));
  assert.equal(downloads.listeners.size, 0);
});
test("cancellation cancels a download that starts after the window closes", async () => {
  const downloads = api("late"),
    controller = new AbortController();
  const saving = saveFile(new Blob(["test"]), "test.txt", {
    downloads,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(saving, { code: "cancelled" });
  await new Promise((r) => setTimeout(r, 40));
  assert(downloads.cancelled.includes(42));
  assert.equal(downloads.listeners.size, 0);
});

function folder(mode = "complete") {
  const files = new Map([["Export.md", "Keep this original file"]]);
  const events = [];
  return {
    files,
    events,
    kind: "directory",
    name: "Chat exports",
    getFileHandle: async (name, { create = false } = {}) => {
      if (!files.has(name) && !create)
        throw new DOMException("Missing", "NotFoundError");
      return {
        createWritable: async () => {
          if (mode === "denied")
            throw new DOMException("Private folder detail", "NotAllowedError");
          if (mode === "late") await new Promise((r) => setTimeout(r, 25));
          let content;
          return {
            write: async (blob) => {
              events.push("write");
              if (mode === "pending") return new Promise(() => {});
              content = await blob.text();
            },
            close: async () => {
              events.push("close");
              if (mode === "close-failed")
                throw new Error("Private disk detail");
              files.set(name, content);
            },
            abort: async () => {
              events.push("abort");
            },
          };
        },
      };
    },
  };
}

test("selected folders save Unicode content and preserve an existing file", async () => {
  const directoryHandle = folder();
  assert.equal(
    await saveFile(new Blob(["日本語 ☕\n  code"]), "Export.md", {
      directoryHandle,
    }),
    "Export (1).md",
  );
  assert.equal(
    directoryHandle.files.get("Export.md"),
    "Keep this original file",
  );
  assert.equal(directoryHandle.files.get("Export (1).md"), "日本語 ☕\n  code");
});

for (const mode of ["denied", "close-failed"])
  test(`selected-folder ${mode} cannot report a completed save`, async () => {
    const directoryHandle = folder(mode);
    await assert.rejects(
      saveFile(new Blob(["test"]), "Export.md", { directoryHandle }),
      { code: "save-interrupted" },
    );
    assert.equal(directoryHandle.files.has("Export (1).md"), false);
  });

test("selected-folder timeout aborts the stream without committing", async () => {
  const directoryHandle = folder("pending");
  await assert.rejects(
    saveFile(new Blob(["test"]), "Export.md", { directoryHandle, timeout: 5 }),
    { code: "save-timeout" },
  );
  assert(directoryHandle.events.includes("abort"));
  assert(!directoryHandle.events.includes("close"));
});

test("selected-folder cancellation aborts a late-opening stream", async () => {
  const directoryHandle = folder("late"),
    controller = new AbortController();
  const saving = saveFile(new Blob(["test"]), "Export.md", {
    directoryHandle,
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(saving, { code: "cancelled" });
  await new Promise((r) => setTimeout(r, 35));
  assert(directoryHandle.events.includes("abort"));
  assert(!directoryHandle.events.includes("write"));
  assert(!directoryHandle.events.includes("close"));
});

test("selected folders reject filenames that escape their directory", async () => {
  const directoryHandle = folder();
  await assert.rejects(
    saveFile(new Blob(["test"]), "../Export.md", { directoryHandle }),
    { code: "save-interrupted" },
  );
});
