import { ExportError, validateConversation, createExport } from "./core.js";
import {
  retrieveCurrentConversation,
  confirmConversationUnchanged,
} from "./retrieval.js";
import { saveFile } from "./save.js";

const $ = (id) => document.getElementById(id);
const errors = {
  "layout-unrecognized": [
    "We couldn’t read this chat’s layout",
    "Your conversation may still be loading, or ChatGPT’s layout may have changed. Nothing was saved. Let the chat finish loading, then try again.",
  ],
  "extension-update": [
    "Reload the extension once",
    "Open chrome://extensions and click Reload on Simple ChatGPT Export. Then close this window and reopen the extension on your chat.",
  ],
  "read-failed": [
    "Chrome couldn’t read this conversation",
    "Nothing was saved. Refresh the ChatGPT tab, then open the extension again.",
  ],
  "wrong-page": [
    "Open a ChatGPT conversation",
    "Then open Simple ChatGPT Export from your browser’s Extensions menu.",
  ],
  access: [
    "Reopen the extension on your chat",
    "Chrome could not read this tab. Close this window, then click the extension again on your ChatGPT conversation.",
  ],
  empty: [
    "There’s no conversation here yet",
    "Send a message in ChatGPT, then try again. No sign-in is required for guest chats.",
  ],
  incomplete: [
    "We couldn’t confirm the whole conversation",
    "Nothing was saved. Reload the chat and try again.",
  ],
  changed: [
    "The conversation changed",
    "Return to the branch you want, then try again. Nothing was saved.",
  ],
  generating: [
    "Let ChatGPT finish first",
    "Try again once the reply is complete.",
  ],
  unsupported: [
    "This content isn’t supported yet",
    "Nothing was saved. Try a conversation containing text only.",
  ],
  "too-large": [
    "This conversation is too large to export safely",
    "Nothing was saved.",
  ],
  cancelled: [
    "Export cancelled",
    "No completed export was confirmed. You can try again whenever you like.",
  ],
  "save-interrupted": [
    "The file wasn’t saved",
    "The save was cancelled or interrupted. Try again and choose a writable folder.",
  ],
  "save-timeout": [
    "We couldn’t confirm the save",
    "Check your browser’s Downloads before trying again.",
  ],
  "signed-out": [
    "Sign in to ChatGPT",
    "Open your conversation, then try again.",
  ],
  offline: [
    "Couldn’t reach ChatGPT",
    "Check your connection and try again. Nothing was saved.",
  ],
};

// The development preview injects its adapter through a separate entry point.
// No demo fixture or test hook is loaded by the packaged extension.
export function mount(adapter) {
  let controller,
    saving = false;
  function status(title = "", body = "") {
    $("status-title").textContent = title;
    $("status-body").textContent = body;
  }
  function busy(value) {
    $("export").disabled = value;
    $("formats").disabled = value;
    $("cancel").hidden = !value;
    $("export-form").setAttribute("aria-busy", String(value));
  }
  $("again").addEventListener("click", () => {
    $("success").hidden = true;
    $("export-form").hidden = false;
    status();
    $("export").focus();
  });
  $("cancel").addEventListener("click", () => {
    controller?.abort();
  });
  window.addEventListener(
    "pagehide",
    () => {
      controller?.abort();
    },
    { once: true },
  );
  $("export-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;
    saving = true;
    controller = new AbortController();
    const { signal } = controller;
    $("success").hidden = true;
    busy(true);
    try {
      const format = document.querySelector(
        'input[name="format"]:checked',
      ).value;
      status(
        "Checking your conversation…",
        "Keep ChatGPT open while we read the conversation. The page may scroll briefly.",
      );
      const { data, identity } = await adapter.retrieve({ signal });
      signal.throwIfAborted();
      const conversation = validateConversation(data, identity);
      const result = createExport(conversation, format);
      await adapter.confirmUnchanged(identity, { signal });
      signal.throwIfAborted();
      status("Downloading…", "Your file includes metadata at the beginning.");
      await adapter.save(
        new Blob([result.content], { type: result.mimeType }),
        result.filename,
        { signal },
      );
      signal.throwIfAborted();
      status(
        "Export saved.",
        `${result.metadata.messageCount} messages${result.omissions.length ? " · text-only copy" : ""}. Ready to read or edit.`,
      );
      $("success").hidden = false;
      $("export-form").hidden = true;
      $("status-title").focus();
    } catch (error) {
      const code = signal.aborted
        ? "cancelled"
        : error instanceof ExportError
          ? error.code
          : "incomplete";
      status(...(errors[code] ?? errors.incomplete));
      $("status-title").focus();
    } finally {
      saving = false;
      busy(false);
      controller = null;
    }
  });
}

if (globalThis.chrome?.runtime?.id) {
  const tabId = Number(new URL(location.href).searchParams.get("tab"));
  mount({
    retrieve: async (options) => {
      if (!Number.isInteger(tabId) || tabId <= 0)
        throw new ExportError("wrong-page");
      let tab;
      try {
        tab = await chrome.tabs.get(tabId);
      } catch {
        throw new ExportError("wrong-page");
      }
      return retrieveCurrentConversation(tab, options);
    },
    confirmUnchanged: (identity, options) =>
      confirmConversationUnchanged(tabId, identity, options),
    save: saveFile,
  });
}
