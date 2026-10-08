import { ExportError } from "./core.js";

export function researchOrigin(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      /^mcp-app-[a-f0-9]+\.web-sandbox\.oaiusercontent\.com$/.test(
        url.hostname,
      ) &&
      !url.port &&
      !url.username &&
      !url.password
    )
      return `${url.origin}/*`;
  } catch {}
  throw new ExportError("research-unrecognized");
}

// Runs in the report frame's MAIN world. Read only the observed report
// component's fields, never application/session state or research activity.
export async function readResearchFrame(urls) {
  if (
    !/^mcp-app-[a-f0-9]+\.web-sandbox\.oaiusercontent\.com$/.test(
      location.hostname,
    )
  )
    return null;
  let containerUrl;
  let ancestor = window;
  for (let i = 0; i < 4; i++) {
    try {
      if (urls.includes(ancestor.location.href)) {
        containerUrl = ancestor.location.href;
        break;
      }
      if (ancestor === ancestor.parent) break;
      ancestor = ancestor.parent;
    } catch {
      break;
    }
  }
  if (!containerUrl) return null;
  const root = document.querySelector('main [class*="_reportPage_"]');
  // The sandbox wrapper contains another frame, not a second report.
  if (!root)
    return document.querySelector("iframe")
      ? null
      : { url: containerUrl, error: "research-unrecognized" };
  function snapshot() {
    const heading = root.querySelector("h1");
    let fiber =
      heading?.[
        Object.keys(heading).find((k) => k.startsWith("__reactFiber$"))
      ];
    for (let i = 0; fiber && i < 22; i++, fiber = fiber.return) {
      const p = fiber.memoizedProps;
      if (typeof p?.report !== "string" || !Array.isArray(p.contentReferences))
        continue;
      if (!Number.isFinite(p.runCompletedAtMs) || p.runCompletedAtMs <= 0)
        return { error: "generating" };
      if (p.report.length > 20_000_000 || p.contentReferences.length > 1000)
        return { error: "too-large" };
      if (
        p.contentReferences.some(
          (r) => r?.items?.length > 1000 || r?.sources?.length > 1000,
        )
      )
        return { error: "too-large" };
      const references = p.contentReferences.map((r) => ({
        type: r.type,
        start: r.start_idx,
        end: r.end_idx,
        matched: r.matched_text,
        status: r.status,
        hasImages: r.has_images,
        items: Array.isArray(r.items)
          ? r.items.map(({ title, url }) => ({ title, url }))
          : undefined,
        sources: Array.isArray(r.sources)
          ? r.sources.map(({ title, url }) => ({ title, url }))
          : undefined,
      }));
      const result = {
        report: p.report,
        messageId: p.reportMessageId,
        completedAt: p.runCompletedAtMs,
        references,
        hasImages: !!root.querySelector("img"),
      };
      if (JSON.stringify(result).length > 20_000_000)
        return { error: "too-large" };
      return result;
    }
    return { error: "research-unrecognized" };
  }
  try {
    const first = snapshot();
    if (first.error) return { url: containerUrl, ...first };
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (
      !root.isConnected ||
      JSON.stringify(first) !== JSON.stringify(snapshot())
    )
      return { url: containerUrl, error: "changed" };
    return { url: containerUrl, ...first };
  } catch {
    return { url: containerUrl, error: "research-unrecognized" };
  }
}

export function formatResearchReport(data) {
  const fail = () => {
    throw new ExportError("research-unrecognized");
  };
  if (data?.error) throw new ExportError(data.error);
  if (
    typeof data?.report !== "string" ||
    !data.report.trim() ||
    !Array.isArray(data.references) ||
    data.references.length > 1000 ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(data.messageId ?? "")
  )
    fail();
  if (data.report.length > 20_000_000) throw new ExportError("too-large");
  const sources = [],
    indices = new Map();
  function source(item) {
    let url;
    try {
      url = new URL(item.url);
    } catch {
      fail();
    }
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.href.length > 10000 ||
      typeof item.title !== "string" ||
      item.title.length > 2000
    )
      fail();
    if (!indices.has(url.href)) {
      const index = sources.length + 1;
      if (index > 1000) fail();
      indices.set(url.href, index);
      sources.push({ title: `[${index}] ${item.title}`, url: url.href });
    }
    return indices.get(url.href);
  }
  const edits = [];
  let image = data.hasImages === true;
  for (const ref of data.references) {
    if (!ref || typeof ref !== "object") fail();
    // The report's source footer can be metadata appended at the end, with
    // a zero-length range rather than a token in the Markdown body.
    const footer =
      ref.type === "sources_footnote" &&
      ref.start === data.report.length &&
      ref.end === ref.start;
    if (
      !Number.isInteger(ref.start) ||
      !Number.isInteger(ref.end) ||
      ref.start < 0 ||
      (ref.end <= ref.start && !footer) ||
      ref.end > data.report.length ||
      (!footer &&
        (typeof ref.matched !== "string" ||
          data.report.slice(ref.start, ref.end) !== ref.matched))
    )
      fail();
    let replacement;
    if (ref.type === "grouped_webpages") {
      if (
        ref.status !== "done" ||
        !Array.isArray(ref.items) ||
        !ref.items.length ||
        ref.items.length > 1000
      )
        fail();
      replacement = `[${[...new Set(ref.items.map(source))].join(", ")}]`;
    } else if (ref.type === "sources_footnote") {
      if (!Array.isArray(ref.sources) || ref.sources.length > 1000) fail();
      ref.sources.forEach(source);
      image ||= ref.hasImages === true;
      replacement = "";
    } else fail();
    if (!footer) edits.push({ start: ref.start, end: ref.end, replacement });
  }
  edits.sort((a, b) => b.start - a.start);
  let text = data.report,
    boundary = text.length;
  for (const edit of edits) {
    if (edit.end > boundary) fail();
    text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
    boundary = edit.start;
  }
  // Internal citation tokens without a recognised reference cannot become
  // portable citations. Fail instead of silently losing their source.
  if (/[\uE200-\uE202]/.test(text)) fail();
  return {
    parts: [
      { type: "text", text: text.trim() },
      ...(image ? [{ type: "omission", kind: "image" }] : []),
    ],
    sources,
  };
}
