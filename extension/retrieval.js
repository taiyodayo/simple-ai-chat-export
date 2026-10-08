import { ExportError, conversationLocation } from "./core.js";
import { readConversationPage } from "./page-reader.js";
import {
  researchOrigin,
  readResearchFrame,
  formatResearchReport,
} from "./research.js";

// A page-controlled MAIN-world promise can never settle. Bound our wait and
// discard late results; Chrome cannot forcibly cancel an injected function.
async function waitForRead(operation, signal, timeout) {
  let timer, abort;
  const stopped = new Promise((_, reject) => {
    abort = () => reject(new ExportError("cancelled"));
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    timer = setTimeout(() => reject(new ExportError("read-timeout")), timeout);
  });
  try {
    return await Promise.race([operation, stopped]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function retrieveCurrentConversation(
  tab,
  { signal, timeout = 30000 } = {},
) {
  signal?.throwIfAborted();
  const location = conversationLocation(tab?.url);
  if (!Number.isInteger(tab.id)) throw new ExportError("wrong-page");
  if (!globalThis.chrome?.scripting?.executeScript)
    throw new ExportError("extension-update");
  async function inject(options) {
    try {
      return await waitForRead(
        chrome.scripting.executeScript(options),
        signal,
        timeout,
      );
    } catch (error) {
      if (error instanceof ExportError) throw error;
      signal?.throwIfAborted();
      // Do not expose raw browser errors, which can contain the private chat URL.
      const message = String(error?.message ?? "");
      if (/No tab with id|tab was closed|Frame with ID.*removed/i.test(message))
        throw new ExportError("changed");
      if (/permission|Cannot access|not allowed/i.test(message))
        throw new ExportError("access");
      throw new ExportError("read-failed");
    }
  }
  const readPage = async (reports = []) => {
    const [result] = await inject({
      target: { tabId: tab.id },
      func: readConversationPage,
      args: [location.url, reports],
    });
    signal?.throwIfAborted();
    if (!result?.result) throw new ExportError("incomplete");
    return result.result;
  };
  let result = await readPage();
  if (result.error === "research-access") {
    const frames = result.researchFrames;
    if (
      !Array.isArray(frames) ||
      !frames.length ||
      frames.length > 20 ||
      new Set(frames.map((f) => f.url)).size !== frames.length
    )
      throw new ExportError("research-unrecognized");
    const origins = [
      ...new Set(frames.map((frame) => researchOrigin(frame.url))),
    ];
    if (
      !(await waitForRead(
        chrome.permissions.contains({ origins }),
        signal,
        timeout,
      ))
    ) {
      const error = new ExportError("research-access");
      error.researchOrigins = origins;
      throw error;
    }
    const results = await inject({
      target: { tabId: tab.id, allFrames: true },
      world: "MAIN",
      func: readResearchFrame,
      args: [frames.map((f) => f.url)],
    });
    signal?.throwIfAborted();
    const reports = frames.map((frame) => {
      const matches = results.filter((r) => r.result?.url === frame.url);
      if (matches.length !== 1) throw new ExportError("research-unrecognized");
      return {
        url: frame.url,
        messageId: matches[0].result.messageId,
        ...formatResearchReport(matches[0].result),
      };
    });
    result = await readPage(reports);
  }
  signal?.throwIfAborted();
  if (result.error) throw new ExportError(result.error);
  const { messages, title } = result;
  const fingerprint = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(messages)),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const selectedNode = messages.at(-1).id;
  const identity = { ...location, selectedNode, fingerprint };
  return {
    identity,
    data: {
      ...location,
      title: ["ChatGPT", "Claude", "Gemini"].includes(title)
        ? messages[0].parts[0].text.slice(0, 100)
        : title,
      selectedNode,
      rootNode: "export-root",
      complete: true,
      pendingPages: 0,
      stable: true,
      generating: false,
      rendered: true,
      nodes: [
        { id: "export-root", kind: "root", parent: null },
        ...messages.map((m, i) => ({
          ...m,
          parent: i ? messages[i - 1].id : "export-root",
        })),
      ],
    },
  };
}

export async function confirmConversationUnchanged(tabId, identity, options) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    throw new ExportError("changed");
  }
  if (conversationLocation(tab.url).url !== identity.url)
    throw new ExportError("changed");
  const current = await retrieveCurrentConversation(tab, options);
  if (current.identity.fingerprint !== identity.fingerprint)
    throw new ExportError("changed");
}
