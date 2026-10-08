// This schema is our internal model, not a claim about ChatGPT's private API.
export class ExportError extends Error {
  constructor(code) {
    super(code);
    this.name = "ExportError";
    this.code = code;
  }
}
const fail = (code = "incomplete") => {
  throw new ExportError(code);
};
const idPattern = /^[a-zA-Z0-9_-]{1,100}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function conversationLocation(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("wrong-page");
  }
  if (url.username || url.password) fail("wrong-page");
  let match, provider;
  if (url.origin === "https://chatgpt.com") {
    match = /^\/(c|uc)\/([^/]+)\/?$/.exec(url.pathname);
    if (!match || !uuidPattern.test(match[2])) fail("wrong-page");
    provider = "ChatGPT";
  } else if (url.origin === "https://claude.ai") {
    match = /^\/(chat)\/([^/]+)\/?$/.exec(url.pathname);
    if (!match || !uuidPattern.test(match[2])) fail("wrong-page");
    provider = "Claude";
  } else if (url.origin === "https://gemini.google.com") {
    match = /^\/((?:u\/\d+\/)?app)\/([a-f0-9]{8,64})\/?$/.exec(url.pathname);
    if (!match) fail("wrong-page");
    provider = "Gemini";
  } else fail("wrong-page");
  return {
    id: match[2],
    url: `${url.origin}/${match[1]}/${match[2]}`,
    provider,
  };
}

export function validateConversation(data, expected) {
  const location = conversationLocation(
    expected.url ?? `https://chatgpt.com/c/${expected.id}`,
  );
  if (location.id !== expected.id) fail("changed");
  if (
    data?.url !== undefined &&
    conversationLocation(data.url).url !== location.url
  )
    fail("changed");
  if (
    !data ||
    data.id !== expected.id ||
    data.selectedNode !== expected.selectedNode
  )
    fail("changed");
  if (data.generating) fail("generating");
  if (data.complete !== true || data.pendingPages !== 0 || data.stable !== true)
    fail();
  if (typeof data.title !== "string" || data.title.length > 1000) fail();
  if (
    !Array.isArray(data.nodes) ||
    data.nodes.length > 100000 ||
    !data.nodes.length
  )
    fail();
  const nodes = new Map();
  for (const node of data.nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !idPattern.test(node.id) ||
      nodes.has(node.id)
    )
      fail();
    nodes.set(node.id, node);
  }
  let cursor = data.selectedNode;
  const visited = new Set(),
    branch = [];
  let size = 0;
  while (cursor !== null) {
    if (
      typeof cursor !== "string" ||
      !idPattern.test(cursor) ||
      visited.has(cursor)
    )
      fail();
    visited.add(cursor);
    const node = nodes.get(cursor);
    if (!node || !("parent" in node)) fail();
    if (node.kind === "root") {
      if (node.id !== data.rootNode || node.parent !== null) fail();
    } else {
      if (!["user", "assistant"].includes(node.role)) fail("unsupported");
      if (
        !Array.isArray(node.parts) ||
        !node.parts.length ||
        node.parts.length > 10000
      )
        fail("unsupported");
      const parts = node.parts.map((part) => {
        if (part?.type === "text" && typeof part.text === "string") {
          size += part.text.length;
          if (size > 20_000_000) fail("too-large");
          return { type: "text", text: part.text };
        }
        if (
          part?.type === "omission" &&
          ["image", "attachment", "audio", "video"].includes(part.kind)
        ) {
          return { type: "omission", kind: part.kind };
        }
        // Unknown content is not silently discarded.
        fail("unsupported");
      });
      if (
        node.sources !== undefined &&
        (!Array.isArray(node.sources) || node.sources.length > 1000)
      )
        fail("unsupported");
      const sources = (node.sources ?? []).map((source) => {
        if (
          typeof source?.title !== "string" ||
          source.title.length > 2000 ||
          typeof source.url !== "string"
        )
          fail("unsupported");
        let url;
        try {
          url = new URL(source.url);
        } catch {
          fail("unsupported");
        }
        if (
          !["https:", "http:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          source.url.length > 10000
        )
          fail("unsupported");
        size += source.title.length + source.url.length;
        if (size > 20_000_000) fail("too-large");
        return { title: source.title, url: url.href };
      });
      if (
        node.sourceMessageIds !== undefined &&
        (data.rendered !== true ||
          !Array.isArray(node.sourceMessageIds) ||
          !node.sourceMessageIds.length ||
          node.sourceMessageIds.length > 1000 ||
          node.sourceMessageIds.some(
            (id) => typeof id !== "string" || !idPattern.test(id),
          ))
      )
        fail();
      branch.push({
        id: node.id,
        role: node.role,
        parts,
        sources,
        ...(node.sourceMessageIds
          ? { sourceMessageIds: node.sourceMessageIds }
          : {}),
      });
    }
    cursor = node.parent;
  }
  if (!visited.has(data.rootNode) || !branch.length) fail();
  branch.reverse();
  return {
    id: data.id,
    url: location.url,
    provider: location.provider,
    rendered: data.rendered === true,
    title: data.title,
    selectedNode: data.selectedNode,
    messages: branch,
  };
}

export function safeFilename(title) {
  let value = title
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "-");
  value = [...value]
    .slice(0, 70)
    .join("")
    .trim()
    .replace(/^[. ]+|[. ]+$/g, "");
  if (!value || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(value))
    value = `Conversation${value ? `-${value}` : ""}`;
  return value;
}

export function createExport(conversation, format, now = new Date()) {
  if (!["md", "txt"].includes(format)) fail("unsupported");
  const location = conversationLocation(
    conversation.url ?? `https://chatgpt.com/c/${conversation.id}`,
  );
  const omissions = [];
  const messages = conversation.messages.map((message, index) => {
    const body = message.parts
      .map((part) => {
        if (part.type === "text") return part.text;
        omissions.push({ message: index + 1, kind: part.kind });
        return `[${part.kind[0].toUpperCase() + part.kind.slice(1)} not included in this text export.]`;
      })
      .join("\n\n");
    const speaker = message.role === "user" ? "You" : location.provider;
    const sources = message.sources.length
      ? "\n\nSources\n" +
        message.sources
          .map((s) => `${s.title.replace(/[\r\n]+/g, " ")}: ${s.url}`)
          .join("\n")
      : "";
    return `${format === "md" ? "## " : ""}${speaker}\n\n${body}${sources}`;
  });
  const notice = omissions.length
    ? "Text-only export. Images, files or other non-text material are marked where omitted.\n\n"
    : "";
  const transcript = notice + messages.join("\n\n---\n\n") + "\n";
  const metadata = {
    schemaVersion: 1,
    exporter: {
      name: "simple-ai-chat-export",
      version: "0.2.2",
      author: "@taiyodayo",
    },
    provider: location.provider,
    title: conversation.title,
    conversationId: conversation.id,
    conversationUrl: conversationLocation(
      conversation.url ?? `https://chatgpt.com/c/${conversation.id}`,
    ).url,
    selectedNodeId: conversation.selectedNode,
    exportedAt: now.toISOString(),
    format,
    messageCount: conversation.messages.length,
    messageIds: conversation.messages.map((m) => m.id),
    ...(conversation.messages.some((m) => m.sourceMessageIds)
      ? {
          renderedSourceMessageIds: conversation.messages.map(
            (m) => m.sourceMessageIds ?? [m.id],
          ),
        }
      : {}),
    scope: conversation.rendered
      ? "displayed conversation (rendered messages)"
      : "selected branch",
    textComplete: !conversation.rendered,
    omissions,
    // Never imply attachments were archived or that timestamps were available when they were not.
    notes: [
      "Non-text files are not downloaded.",
      "Artifacts and Canvas content outside the displayed messages are not included.",
      "Original message timestamps are not available.",
      ...(conversation.rendered
        ? [
            "The displayed transcript was checked for stability; server-side history completeness cannot be verified.",
            "Citation labels are preserved. Source URLs are included where present in message content or supported report citation data.",
          ]
        : []),
    ],
  };
  const metadataText = JSON.stringify(metadata, null, 2);
  const header =
    format === "md"
      ? `# Export metadata\n\n\`\`\`json\n${metadataText}\n\`\`\`\n\n---\n\n`
      : `Export metadata\n\n${metadataText}\n\n---\n\n`;
  return {
    content: header + transcript,
    filename: `${safeFilename(conversation.title)}.${format}`,
    mimeType:
      format === "md"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
    transcript,
    metadata,
    basename: safeFilename(conversation.title),
    omissions,
  };
}
