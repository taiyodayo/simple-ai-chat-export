import test from "node:test";
import assert from "node:assert/strict";
import { saveArchive } from "../extension/save.js";

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
    download: async () => {
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
      await saveArchive(new Blob(["test"]), "test.zip", { downloads }),
      42,
    );
    assert.equal(downloads.listeners.size, 0);
    assert.deepEqual(downloads.cancelled, []);
  });
for (const mode of ["interrupted", "reject"])
  test(`save rejects ${mode} without leaking raw browser errors`, async () => {
    const downloads = api(mode);
    await assert.rejects(
      saveArchive(new Blob(["test"]), "test.zip", { downloads }),
      { code: "save-interrupted" },
    );
    assert.equal(downloads.listeners.size, 0);
  });
test("save timeout cancels its own download", async () => {
  const downloads = api("pending");
  await assert.rejects(
    saveArchive(new Blob(["test"]), "test.zip", { downloads, timeout: 5 }),
    { code: "save-timeout" },
  );
  assert(downloads.cancelled.includes(42));
  assert.equal(downloads.listeners.size, 0);
});
test("cancellation cancels a download that starts after the window closes", async () => {
  const downloads = api("late"),
    controller = new AbortController();
  const saving = saveArchive(new Blob(["test"]), "test.zip", {
    downloads,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(saving, { code: "cancelled" });
  await new Promise((r) => setTimeout(r, 40));
  assert(downloads.cancelled.includes(42));
  assert.equal(downloads.listeners.size, 0);
});
