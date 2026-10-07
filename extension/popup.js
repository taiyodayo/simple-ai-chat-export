import {
  ExportError,
  conversationLocation,
  validateConversation,
  createExport,
} from "./core.js";
import { retrieveCurrentConversation } from "./retrieval.js";
import { exportArchive } from "./archive.js";
import { saveArchive } from "./save.js";

const $ = (id) => document.getElementById(id);
const errors = {
  "wrong-page": [
    "Open a saved ChatGPT conversation",
    "Then open Simple Chat Export from your browser’s Extensions menu.",
  ],
  "verification-pending": [
    "Live export is not ready yet",
    "This private prototype is awaiting a check with ChatGPT. No conversation has been read or saved.",
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
    pending,
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
  function resetPending() {
    pending = null;
    $("notice").hidden = true;
    $("export").textContent = "Export conversation ↓";
  }
  $("formats").addEventListener("change", resetPending);
  $("again").addEventListener("click", () => {
    $("success").hidden = true;
    $("export-form").hidden = false;
    status();
    $("export").focus();
  });
  $("cancel").addEventListener("click", () => {
    controller?.abort();
    resetPending();
  });
  window.addEventListener(
    "pagehide",
    () => {
      controller?.abort();
      pending = null;
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
      let result;
      if (pending) {
        await adapter.confirmUnchanged(pending.identity, { signal });
        result = pending.result;
      } else {
        status(
          "Checking your conversation…",
          "Keep this window open until the export finishes.",
        );
        const { data, identity } = await adapter.retrieve({ signal });
        signal.throwIfAborted();
        const conversation = validateConversation(data, identity);
        result = createExport(conversation, format);
        if (result.omissions.length) {
          pending = { result, identity };
          $("notice").hidden = false;
          $("export").textContent = "Export text only ↓";
          status(
            "Some content can’t be included",
            `${conversation.messages.length} messages. Non-text material will be marked in the file.`,
          );
          $("notice").scrollIntoView({ block: "nearest" });
          return;
        }
        await adapter.confirmUnchanged(identity, { signal });
      }
      signal.throwIfAborted();
      status(
        "Choose where to save",
        "Your ZIP contains the conversation and its metadata.",
      );
      await adapter.save(
        exportArchive(result, format),
        `${result.basename}.zip`,
        { signal },
      );
      signal.throwIfAborted();
      status(
        "Export saved.",
        `${result.metadata.messageCount} messages${result.omissions.length ? " · text-only copy" : ""}. Unzip the file to read or edit your conversation.`,
      );
      $("success").hidden = false;
      $("export-form").hidden = true;
      $("status-title").focus();
      resetPending();
    } catch (error) {
      const code = signal.aborted
        ? "cancelled"
        : error instanceof ExportError
          ? error.code
          : "incomplete";
      status(...(errors[code] ?? errors.incomplete));
      $("status-title").focus();
      resetPending();
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
    confirmUnchanged: async (identity) => {
      const tab = await chrome.tabs.get(tabId);
      if (conversationLocation(tab.url).id !== identity.id)
        throw new ExportError("changed");
      // Retrieval remains gated: live branch revalidation must be implemented
      // from observed evidence before this path can ever save real data.
      throw new ExportError("verification-pending");
    },
    save: saveArchive,
  });
}
