import { ExportError, conversationLocation } from "./core.js";
import { readConversationPage } from "./page-reader.js";

export async function retrieveCurrentConversation(tab, { signal } = {}) {
  signal?.throwIfAborted();
  const location = conversationLocation(tab?.url);
  if (!Number.isInteger(tab.id)) throw new ExportError("wrong-page");
  if (!globalThis.chrome?.scripting?.executeScript)
    throw new ExportError("extension-update");
  let result;
  try {
    [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readConversationPage,
      args: [location.url],
    });
  } catch (error) {
    signal?.throwIfAborted();
    // Do not expose raw browser errors, which can contain the private chat URL.
    const message = String(error?.message ?? "");
    if (/No tab with id|tab was closed|Frame with ID.*removed/i.test(message))
      throw new ExportError("changed");
    if (/permission|Cannot access|not allowed/i.test(message))
      throw new ExportError("access");
    throw new ExportError("read-failed");
  }
  signal?.throwIfAborted();
  if (!result?.result) throw new ExportError("incomplete");
  if (result.result.error) throw new ExportError(result.result.error);
  const { messages, title } = result.result;
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
      title:
        title === "ChatGPT" ? messages[0].parts[0].text.slice(0, 100) : title,
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
