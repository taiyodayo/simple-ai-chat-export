import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  validateConversation,
  conversationLocation,
  createExport,
  safeFilename,
} from "../extension/core.js";
import { archiveBytes, exportArchive } from "../extension/archive.js";
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
test("ZIP is readable by an independent implementation and has valid CRCs", async () => {
  const data = fixture(),
    result = createExport(validateConversation(data, identity(data)), "md");
  const bytes = Buffer.from(await exportArchive(result, "md").arrayBuffer());
  const python = spawnSync(
    "python3",
    [
      "-c",
      'import io,json,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.testzip() is None; print(json.dumps({n:z.read(n).decode("utf-8") for n in z.namelist()}))',
    ],
    { input: bytes },
  );
  assert.equal(python.status, 0, python.stderr.toString());
  const contents = JSON.parse(python.stdout);
  assert.deepEqual(Object.keys(contents), ["conversation.md", "metadata.json"]);
  assert.equal(contents["conversation.md"], result.transcript);
  assert.deepEqual(JSON.parse(contents["metadata.json"]), result.metadata);
  assert.throws(() => archiveBytes([["../evil", "no"]]));
});
test("live retrieval is explicitly gated, never a partial DOM fallback", async () => {
  await assert.rejects(
    retrieveCurrentConversation({
      url: `https://chatgpt.com/c/${conversationId}`,
    }),
    { code: "verification-pending" },
  );
});
