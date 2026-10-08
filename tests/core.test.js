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

test("only exact saved or guest conversation routes are accepted", () => {
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
    "https://chatgpt.com/uc/not-an-id",
    "https://chatgpt.com/uc/" + conversationId + "/extra",
    "https://chatgpt.com.evil.test/uc/" + conversationId,
    "javascript:alert(1)",
  ]) {
    assert.throws(() => conversationLocation(url), { code: "wrong-page" });
  }
});
test("guest URLs are canonicalised and retained in TXT and Markdown metadata", () => {
  const url = `https://chatgpt.com/uc/${conversationId}`;
  assert.deepEqual(conversationLocation(`${url}/?ignored=yes#fragment`), {
    id: conversationId,
    url,
    provider: "ChatGPT",
  });
  const data = { ...fixture(), url };
  const conversation = validateConversation(data, { ...identity(data), url });
  for (const format of ["txt", "md"]) {
    assert.equal(
      createExport(conversation, format).metadata.conversationUrl,
      url,
    );
  }
  assert.throws(
    () =>
      validateConversation(data, {
        ...identity(data),
        url: `https://chatgpt.com/c/${conversationId}`,
      }),
    { code: "changed" },
  );
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
  const literal =
    '<img src="https://invalid.example/marker"><script>alert(1)</script>';
  data.nodes[1].parts[0].text += "\n" + literal;
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
    assert(result.content.includes(literal));
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
test("rendered transcript metadata does not claim server-side completeness", () => {
  const data = { ...fixture(), rendered: true };
  const result = createExport(
    validateConversation(data, identity(data)),
    "txt",
  );
  assert.equal(result.metadata.textComplete, false);
  assert.match(result.metadata.scope, /rendered/);
});

test("saved Claude and Gemini URLs retain their provider and canonical identity", () => {
  for (const [provider, url] of [
    ["Claude", `https://claude.ai/chat/${conversationId}`],
    ["Gemini", "https://gemini.google.com/app/0123456789abcdef"],
    ["Gemini", "https://gemini.google.com/u/1/app/0123456789abcdef"],
  ]) {
    const location = conversationLocation(`${url}/?ignored=true#fragment`);
    assert.equal(location.url, url);
    assert.equal(location.provider, provider);
    const data = { ...fixture(), id: location.id, url };
    const conversation = validateConversation(data, { ...identity(data), url });
    for (const format of ["md", "txt"]) {
      const result = createExport(conversation, format);
      assert.equal(result.metadata.provider, provider);
      assert.equal(result.metadata.conversationUrl, url);
      assert.ok(result.transcript.includes(`${provider}\n\n`));
      assert.equal(result.metadata.exporter.name, "simple-ai-chat-export");
    }
  }
  for (const url of [
    `https://claude.ai.evil.test/chat/${conversationId}`,
    `http://claude.ai/chat/${conversationId}`,
    `https://user:pass@claude.ai/chat/${conversationId}`,
    `https://claude.ai/share/${conversationId}`,
    "https://claude.ai/new",
    "https://gemini.google.com/app",
    "https://gemini.google.com/app/not-a-chat-id",
    "https://gemini.google.com/share/0123456789abcdef",
    "https://gemini.google.com/u/1/app/0123456789abcdef/extra",
  ])
    assert.throws(() => conversationLocation(url), { code: "wrong-page" });
});
