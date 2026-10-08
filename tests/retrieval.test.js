import test from "node:test";
import assert from "node:assert/strict";
import { retrieveCurrentConversation } from "../extension/retrieval.js";
const tab = {
  id: 12,
  url: "https://chatgpt.com/uc/11111111-1111-4111-8111-111111111111",
};
test("old installed permissions request an extension reload, not reopening the tab", async () => {
  const previous = globalThis.chrome;
  try {
    globalThis.chrome = {};
    await assert.rejects(retrieveCurrentConversation(tab), {
      code: "extension-update",
    });
  } finally {
    globalThis.chrome = previous;
  }
});
for (const [message, code] of [
  [
    "Cannot access contents of url https://chatgpt.com/uc/private. Extension manifest must request permission",
    "access",
  ],
  ["No tab with id: 12", "changed"],
  [
    "Unexpected injection error at https://chatgpt.com/uc/private",
    "read-failed",
  ],
])
  test(`injection failure maps to ${code} without leaking browser details`, async () => {
    const previous = globalThis.chrome;
    try {
      globalThis.chrome = {
        scripting: {
          executeScript: async () => {
            throw new Error(message);
          },
        },
      };
      await assert.rejects(
        retrieveCurrentConversation(tab),
        (e) => e.code === code && !e.message.includes("private"),
      );
    } finally {
      globalThis.chrome = previous;
    }
  });

test("cancelling an unresolved injected reader releases the caller", async () => {
  const previous = globalThis.chrome;
  const controller = new AbortController();
  let resolveInjection;
  try {
    globalThis.chrome = {
      scripting: {
        executeScript: () =>
          new Promise((resolve) => {
            resolveInjection = resolve;
          }),
      },
    };
    const reading = retrieveCurrentConversation(tab, {
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(reading, { code: "cancelled" });
    // A late page result must not become a conversation or continue to saving.
    resolveInjection([{ result: { error: "unsupported" } }]);
  } finally {
    globalThis.chrome = previous;
  }
});

test("an unresolved injected reader has a bounded deadline", async () => {
  const previous = globalThis.chrome;
  let rejectInjection;
  try {
    globalThis.chrome = {
      scripting: {
        executeScript: () =>
          new Promise((_, reject) => {
            rejectInjection = reject;
          }),
      },
    };
    await assert.rejects(retrieveCurrentConversation(tab, { timeout: 5 }), {
      code: "read-timeout",
    });
    // The race has a rejection handler for an operation settling after timeout.
    rejectInjection(new Error("private late browser error"));
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    globalThis.chrome = previous;
  }
});
