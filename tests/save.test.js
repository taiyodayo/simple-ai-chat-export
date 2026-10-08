import test from "node:test";
import assert from "node:assert/strict";
import { saveFile } from "../extension/save.js";

function nativeEnvironment(t, click = () => {}) {
  const anchors = [],
    urls = [],
    revoked = [],
    timers = [];
  const previous = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "a");
      const anchor = {
        click,
        remove() {
          this.removed = true;
        },
      };
      anchors.push(anchor);
      return anchor;
    },
    body: {
      append(anchor) {
        anchor.appended = true;
      },
    },
  };
  t.after(() => {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  });
  t.mock.method(URL, "createObjectURL", (blob) => {
    urls.push(blob);
    return `blob:local/${urls.length}`;
  });
  t.mock.method(URL, "revokeObjectURL", (url) => revoked.push(url));
  t.mock.method(globalThis, "setTimeout", (callback, delay) => {
    timers.push({ callback, delay });
    return 1;
  });
  return { anchors, urls, revoked, timers };
}

test("native downloads return a handoff, keep Unicode names, and release each Blob URL", async (t) => {
  const environment = nativeEnvironment(t);
  for (let i = 0; i < 2; i++) {
    const outcome = await saveFile(new Blob(["日本語 ☕"]), "日本語 Chat.md");
    assert.deepEqual(outcome, {
      status: "download-started",
      filename: "日本語 Chat.md",
    });
  }
  assert.equal(environment.anchors.length, 2);
  for (const anchor of environment.anchors) {
    assert.equal(anchor.download, "日本語 Chat.md");
    assert.equal(anchor.appended, true);
    assert.equal(anchor.removed, true);
  }
  assert.equal(await environment.urls[0].text(), "日本語 ☕");
  assert.deepEqual(environment.revoked, []);
  for (const timer of environment.timers) {
    assert.equal(timer.delay, 1000);
    timer.callback();
  }
  assert.deepEqual(environment.revoked, ["blob:local/1", "blob:local/2"]);
});

test("native handoff failure releases its URL immediately and hides browser details", async (t) => {
  const environment = nativeEnvironment(t, () => {
    throw new Error("Private detail");
  });
  await assert.rejects(saveFile(new Blob(["test"]), "Chat.txt"), {
    code: "save-interrupted",
  });
  assert.deepEqual(environment.revoked, ["blob:local/1"]);
  assert.equal(environment.anchors[0].removed, true);
  assert.equal(environment.timers.length, 0);
});

test("unsafe filenames and pre-cancelled exports create no anchors or URLs", async (t) => {
  const environment = nativeEnvironment(t);
  for (const filename of [
    "",
    ".",
    "..",
    "../Chat.md",
    "folder\\Chat.md",
    "Chat\n.md",
    "C:Chat.txt",
    "NUL.txt",
    "Chat.md ",
  ]) {
    await assert.rejects(saveFile(new Blob(["test"]), filename), {
      code: "save-interrupted",
    });
  }
  await assert.rejects(
    saveFile(new Blob(["test"]), "Chat.txt", { signal: AbortSignal.abort() }),
    { code: "cancelled" },
  );
  assert.equal(environment.anchors.length, 0);
  assert.equal(environment.urls.length, 0);
});

// Independent FIFO lock manager representing a shared origin, including the
// Web Locks rule that abort drops queued requests but does not revoke holders.
function originLocks() {
  const queues = new Map();
  return {
    request(name, { signal }, callback) {
      return new Promise((resolve, reject) => {
        const queue = queues.get(name) ?? [];
        queues.set(name, queue);
        const entry = { callback, resolve, reject, active: false };
        const abort = () => {
          if (entry.active) return;
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(new DOMException("Aborted", "AbortError"));
        };
        entry.run = () => {
          entry.active = true;
          signal.removeEventListener("abort", abort);
          Promise.resolve()
            .then(callback)
            .then(resolve, reject)
            .finally(() => {
              queue.shift();
              queue[0]?.run();
            });
        };
        if (signal.aborted) return abort();
        signal.addEventListener("abort", abort, { once: true });
        queue.push(entry);
        if (queue.length === 1) entry.run();
      });
    },
  };
}
function folder(mode = "complete") {
  const files = new Map([["Export.md", "Keep this original file"]]);
  const events = [];
  return {
    files,
    events,
    kind: "directory",
    name: "Chat exports",
    getFileHandle: async (name, { create = false } = {}) => {
      events.push(`probe:${name}`);
      if (!files.has(name) && !create)
        throw new DOMException("Missing", "NotFoundError");
      if (create && !files.has(name)) files.set(name, "");
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
              if (mode === "slow") await new Promise((r) => setTimeout(r, 25));
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
const options = (directoryHandle, extra = {}) => ({
  directoryHandle,
  locks: originLocks(),
  ...extra,
});

test("selected folders confirm after close, preserve existing files, and keep Unicode content", async () => {
  const directory = folder();
  assert.deepEqual(
    await saveFile(
      new Blob(["日本語 ☕\n  code"]),
      "Export.md",
      options(directory),
    ),
    { status: "saved", filename: "Export (1).md" },
  );
  assert.equal(directory.files.get("Export.md"), "Keep this original file");
  assert.equal(directory.files.get("Export (1).md"), "日本語 ☕\n  code");
  assert.equal(directory.events.at(-1), "close");
});
for (const mode of ["denied", "close-failed"])
  test(`selected-folder ${mode} cannot report a completed save`, async () => {
    const directory = folder(mode);
    await assert.rejects(
      saveFile(new Blob(["test"]), "Export.md", options(directory)),
      { code: "save-interrupted" },
    );
    assert.equal(directory.files.get("Export (1).md"), "");
  });

test("selected-folder timeout aborts the stream without committing", async () => {
  const directory = folder("pending");
  await assert.rejects(
    saveFile(
      new Blob(["test"]),
      "Export.md",
      options(directory, { timeout: 5 }),
    ),
    { code: "save-timeout" },
  );
  await new Promise((r) => setTimeout(r, 0));
  assert(directory.events.includes("abort"));
  assert(!directory.events.includes("close"));
});

test("selected-folder cancellation aborts a late-opening stream while retaining its lock", async () => {
  const directory = folder("late"),
    controller = new AbortController();
  const saving = saveFile(
    new Blob(["test"]),
    "Export.md",
    options(directory, { signal: controller.signal }),
  );
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(saving, { code: "cancelled" });
  await new Promise((r) => setTimeout(r, 35));
  assert(directory.events.includes("abort"));
  assert(!directory.events.includes("write"));
  assert(!directory.events.includes("close"));
});

test("two windows sharing one origin preserve both concurrent exports", async () => {
  const directory = folder("slow"),
    locks = originLocks();
  const outcomes = await Promise.all(
    ["First window", "Second window"].map((text) =>
      saveFile(new Blob([text]), "Chat.md", {
        directoryHandle: directory,
        locks,
      }),
    ),
  );
  assert.deepEqual(
    outcomes.map((outcome) => outcome.filename),
    ["Chat.md", "Chat (1).md"],
  );
  assert.equal(directory.files.get("Chat.md"), "First window");
  assert.equal(directory.files.get("Chat (1).md"), "Second window");
});
for (const mode of ["cancelled", "save-timeout"])
  test(`a ${mode} queued window never accesses the folder after the holder releases`, async () => {
    const locks = originLocks(),
      controller = new AbortController();
    let release, entered;
    const acquired = new Promise((r) => {
      entered = r;
    });
    const holder = locks.request(
      "simple-ai-chat-export-custom-save",
      { signal: new AbortController().signal },
      async () => {
        entered();
        await new Promise((r) => {
          release = r;
        });
      },
    );
    await acquired;
    const directory = folder();
    const saving = saveFile(new Blob(["Never write"]), "Chat.md", {
      directoryHandle: directory,
      locks,
      signal: controller.signal,
      timeout: mode === "save-timeout" ? 5 : 1000,
    });
    if (mode === "cancelled") controller.abort();
    await assert.rejects(saving, { code: mode });
    release();
    await holder;
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(directory.events, []);
    assert.equal(directory.files.has("Chat.md"), false);
  });

test("unavailable origin locks fail closed before accessing files", async () => {
  const directory = folder();
  await assert.rejects(
    saveFile(new Blob(["test"]), "Chat.md", {
      directoryHandle: directory,
      locks: null,
    }),
    { code: "save-interrupted" },
  );
  assert.deepEqual(directory.events, []);
});
