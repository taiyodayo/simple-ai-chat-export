import test from "node:test";
import assert from "node:assert/strict";
import {
  validateConversation,
  conversationLocation,
  createExport,
  safeFilename,
} from "../extension/core.js";
import { retrieveCurrentConversation } from "../extension/retrieval.js";
import { fixture, identity, conversationId } from "./fixtures.js";

test("only the exact saved-conversation origin/path is accepted", () => {
  assert.equal(
    conversationLocation(`https://chatgpt.com/c/${conversationId}?ignored=yes`)
      .id,
    conversationId,
  );
  for (const url of [
    "https://chatgpt.com.evil.test/c/" + conversationId,
    "http://chatgpt.com/c/" + conversationId,
    "https://user:pass@chatgpt.com/c/" + conversationId,
    "https://chatgpt.com/share/" + conversationId,
    "https://chatgpt.com/",
    "https://chatgpt.com/c/not-an-id",
    "javascript:alert(1)",
  ]) {
    assert.throws(() => conversationLocation(url), { code: "wrong-page" });
  }
});
test("long branch is complete and independent of visible DOM, excluding siblings", () => {
  const data = fixture({ count: 10000 });
  const conversation = validateConversation(data, identity(data));
  assert.equal(conversation.messages.length, 10000);
  assert.equal(conversation.messages[0].id, "message-1");
  assert.equal(conversation.messages.at(-1).id, "message-10000");
  assert(
    !createExport(conversation, "md").transcript.includes("DO NOT EXPORT"),
  );
});
test("edited/regenerated branch follows the explicit selected leaf", () => {
  const data = fixture();
  data.selectedNode = "alternative";
  const result = validateConversation(data, identity(data));
  assert.deepEqual(
    result.messages.map((m) => m.id),
    ["message-1", "alternative"],
  );
});
for (const [name, change, code = "incomplete"] of [
  ["missing earlier message", (d) => d.nodes.splice(1, 1)],
  ["duplicate node", (d) => d.nodes.push(d.nodes[1])],
  ["cycle", (d) => (d.nodes[1].parent = "message-2")],
  ["missing parent field", (d) => delete d.nodes[1].parent],
  ["unknown root", (d) => (d.rootNode = "absent")],
  ["truncated branch", (d) => (d.nodes[1].parent = null)],
  ["unresolved pagination", (d) => (d.pendingPages = 1)],
  ["unknown pagination", (d) => delete d.pendingPages],
  ["unstable response", (d) => (d.stable = false)],
  ["partial response", (d) => (d.complete = false)],
  ["wrong conversation", (d) => (d.id = "other"), "changed"],
  ["changed branch", (d) => (d.selectedNode = "alternative"), "changed"],
  ["ongoing generation", (d) => (d.generating = true), "generating"],
  ["unknown role", (d) => (d.nodes[1].role = "tool"), "unsupported"],
  [
    "unknown part",
    (d) => d.nodes[1].parts.push({ type: "mystery" }),
    "unsupported",
  ],
  [
    "unsafe source link",
    (d) => (d.nodes[2].sources[0].url = "javascript:alert(1)"),
    "unsupported",
  ],
  [
    "credentials in source link",
    (d) => (d.nodes[2].sources[0].url = "https://user:secret@example.com"),
    "unsupported",
  ],
  [
    "malformed source collection",
    (d) => (d.nodes[2].sources = {}),
    "unsupported",
  ],
])
  test(`rejects ${name}`, () => {
    const data = fixture(),
      expected = identity(data);
    change(data);
    assert.throws(() => validateConversation(data, expected), { code });
  });
test("preserves Unicode, paragraphs, code indentation, tables and sources in both formats", () => {
  const data = fixture(),
    conversation = validateConversation(data, identity(data));
  for (const format of ["md", "txt"]) {
    const result = createExport(
      conversation,
      format,
      new Date("2026-10-07T00:00:00Z"),
    );
    for (const content of [
      "日本語 ☕",
      "  console.log(tea);",
      "| Cups | 2 |",
      "https://example.com/reference",
    ])
      assert(result.transcript.includes(content));
    assert.equal(result.metadata.exportedAt, "2026-10-07T00:00:00.000Z");
    assert.equal(result.metadata.messageCount, 2);
    assert.equal(
      result.metadata.conversationUrl,
      `https://chatgpt.com/c/${conversationId}`,
    );
    assert.equal(result.metadata.author, undefined);
    assert(!result.transcript.includes("buymeacoffee"));
  }
});
test("known omissions are explicit in the transcript and metadata", () => {
  const data = fixture({ omission: true });
  const result = createExport(validateConversation(data, identity(data)), "md");
  assert.match(result.transcript, /^Text-only export/);
  assert.match(result.transcript, /Image not included/);
  assert.deepEqual(result.metadata.omissions, [{ message: 2, kind: "image" }]);
});
test("filenames cannot escape their directory or use Windows reserved names", () => {
  for (const name of [
    "../../secret",
    "CON",
    "NUL.txt",
    "...",
    "😀".repeat(100),
    "\u202eexe.txt",
    "a/b\\c:*?",
  ]) {
    const clean = safeFilename(name);
    assert(clean.length > 0);
    assert(!/[<>:"/\\|?*\u202e]/.test(clean));
    assert(!/^[. ]|[. ]$/.test(clean));
    assert(!/^(con|nul)(\.|$)/i.test(clean));
  }
});
test("one UTF-8 file starts with complete metadata and preserves the transcript", () => {
  const data = fixture({ omission: true });
  data.title = '日本語 "quoted"\n```\n# Not a header';
  const conversation = validateConversation(data, identity(data));
  for (const format of ["md", "txt"]) {
    const result = createExport(conversation, format);
    const prefix =
      format === "md"
        ? "# Export metadata\n\n```json\n"
        : "Export metadata\n\n";
    assert(result.content.startsWith(prefix));
    const header = result.content.slice(
      prefix.length,
      result.content.indexOf("\n\n---\n\n"),
    );
    const json = format === "md" ? header.slice(0, -4) : header;
    assert.deepEqual(JSON.parse(json), result.metadata);
    assert(result.content.endsWith(result.transcript));
    assert(result.filename.endsWith(`.${format}`));
    assert(!result.filename.endsWith(".zip"));
    assert(
      result.mimeType.startsWith(
        format === "md" ? "text/markdown" : "text/plain",
      ),
    );
    assert.equal(
      new TextDecoder().decode(new TextEncoder().encode(result.content)),
      result.content,
    );
  }
});
test("live retrieval is explicitly gated, never a partial DOM fallback", async () => {
  await assert.rejects(
    retrieveCurrentConversation({
      url: `https://chatgpt.com/c/${conversationId}`,
    }),
    { code: "verification-pending" },
  );
});
