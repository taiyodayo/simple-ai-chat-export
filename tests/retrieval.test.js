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
