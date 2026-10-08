import { ExportError, validateConversation, createExport } from "./core.js";
import {
  retrieveCurrentConversation,
  confirmConversationUnchanged,
} from "./retrieval.js";
import { saveFile } from "./save.js";

const $ = (id) => document.getElementById(id);
const errors = {
  "research-access": [
    "Allow access to the Deep Research report",
    "ChatGPT displays this report in a separate embedded page. Choose Allow Deep Research and export, then approve Chrome’s site-access request to include its text and citations.",
  ],
  "research-permission": [
    "Deep Research access wasn’t granted",
    "Nothing was saved. Allow report access to export this conversation.",
  ],
  "research-unrecognized": [
    "We couldn’t read this Deep Research report",
    "Nothing was saved. Keep the completed report open in the conversation and try again. This report’s layout or citations may not be supported yet.",
  ],
  "layout-unrecognized": [
    "We couldn’t read this chat’s layout",
    "Your conversation may still be loading, or the app’s layout may have changed. Nothing was saved. Let the chat finish loading, then try again.",
  ],
  "extension-update": [
    "Reload the extension once",
    "Open chrome://extensions and click Reload on Simple AI-Chat export for ChatGPT, Claude, Gemini. Then close this window and reopen the extension on your chat.",
  ],
  "read-failed": [
    "Chrome couldn’t read this conversation",
    "Nothing was saved. Refresh the chat tab, then open the extension again.",
  ],
  "read-timeout": [
    "The chat took too long to read",
    "Nothing was downloaded. Keep your chat open and try again once it has finished loading.",
  ],
  "wrong-page": [
    "Open a ChatGPT, Claude or Gemini conversation",
    "Then open Simple AI-Chat export for ChatGPT, Claude, Gemini from your browser’s Extensions menu.",
  ],
  access: [
    "Reopen the extension on your chat",
    "Chrome could not read this tab. Close this window, then click the extension again on your conversation.",
  ],
  empty: [
    "There’s no conversation here yet",
    "Open a saved conversation, then try again. ChatGPT guest chats also work.",
  ],
  incomplete: [
    "We couldn’t verify the rendered conversation",
    "Nothing was saved. Reload the chat and try again.",
  ],
  changed: [
    "The conversation changed",
    "Return to the branch you want, then try again. Nothing was saved.",
  ],
  generating: [
    "Let the reply finish first",
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
    "We couldn’t confirm the save",
    "Saving was interrupted. Check your folder or Chrome Downloads before trying again.",
  ],
  "save-timeout": [
    "We couldn’t confirm the save",
    "Check the selected folder before trying again.",
  ],
  "signed-out": [
    "Sign in to your chat app",
    "Open your conversation, then try again.",
  ],
  offline: [
    "Couldn’t reach your chat app",
    "Check your connection and try again. Nothing was saved.",
  ],
};

// The development preview injects its adapter through a separate entry point.
// No demo fixture or test hook is loaded by the packaged extension.
export function mount(adapter) {
  let controller,
    researchOrigins,
    directoryHandle,
    choosing = false,
    saving = false;
  let defaultPath = /Win/.test(navigator.platform)
    ? "%USERPROFILE%\\Downloads"
    : "~/Downloads";
  function destination() {
    $("destination-name").textContent = directoryHandle?.name ?? "Downloads";
    $("destination-path").textContent = directoryHandle
      ? `…/${directoryHandle.name}`
      : defaultPath;
    $("destination-path").title = directoryHandle
      ? "Chrome exposes the folder name, not its full path."
      : "Standard Downloads path. Chrome’s download settings can use a different folder.";
    $("destination-hint").textContent = directoryHandle
      ? "Selected folder · used until this window closes."
      : "Uses Chrome’s download location.";
    $("reset-directory").hidden = !directoryHandle;
  }
  destination();
  globalThis.chrome?.runtime
    ?.getPlatformInfo?.()
    .then(({ os }) => {
      defaultPath = os === "win" ? "%USERPROFILE%\\Downloads" : "~/Downloads";
      destination();
    })
    .catch(() => {});
  function status(title = "", body = "") {
    $("status-title").textContent = title;
    $("status-body").textContent = body;
  }
  function busy(value) {
    $("export").disabled = value;
    $("formats").disabled = value;
    $("choose-directory").disabled = value;
    $("reset-directory").disabled = value;
    $("cancel").hidden = !value;
    $("export-form").setAttribute("aria-busy", String(value));
  }
  $("choose-directory").addEventListener("click", async () => {
    if (saving || choosing) return;
    choosing = true;
    busy(true);
    $("cancel").hidden = true;
    $("directory-status").hidden = true;
    try {
      const pick =
        adapter.selectDirectory ??
        ((options) => window.showDirectoryPicker(options));
      const selected = await pick({
        id: "conversation-export",
        startIn: directoryHandle ?? "downloads",
        mode: "readwrite",
      });
      if (selected?.kind !== "directory" || typeof selected.name !== "string")
        throw new Error("Invalid folder");
      directoryHandle = selected;
      destination();
    } catch (error) {
      $("directory-status").textContent =
        error.name === "AbortError"
          ? "Folder unchanged."
          : "Couldn’t open this folder. Try again or use Downloads.";
      $("directory-status").hidden = false;
    } finally {
      choosing = false;
      busy(false);
      $("choose-directory").focus();
    }
  });
  $("reset-directory").addEventListener("click", () => {
    directoryHandle = undefined;
    destination();
    $("directory-status").hidden = true;
    $("choose-directory").focus();
  });
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
    if (saving || choosing) return;
    saving = true;
    controller = new AbortController();
    const { signal } = controller;
    $("success").hidden = true;
    busy(true);
    try {
      // Request synchronously from this click, before any asynchronous page read.
      const permissionRequest = researchOrigins
        ? adapter.requestResearchPermission({ origins: researchOrigins })
        : null;
      if (permissionRequest) {
        if (!(await permissionRequest))
          throw new ExportError("research-permission");
        signal.throwIfAborted();
        researchOrigins = undefined;
        $("export").textContent = "Export conversation ↓";
      }
      const format = document.querySelector(
        'input[name="format"]:checked',
      ).value;
      status(
        "Checking your conversation…",
        "Keep your chat open while we read the conversation. The page may scroll briefly.",
      );
      const { data, identity } = await adapter.retrieve({ signal });
      signal.throwIfAborted();
      const conversation = validateConversation(data, identity);
      const result = createExport(conversation, format);
      await adapter.confirmUnchanged(identity, { signal });
      signal.throwIfAborted();
      status("Saving…", "Your file includes metadata at the beginning.");
      const outcome = await adapter.save(
        new Blob([result.content], { type: result.mimeType }),
        result.filename,
        { signal, directoryHandle },
      );
      if (!["download-started", "saved"].includes(outcome?.status))
        throw new ExportError("save-interrupted");
      const saved = outcome.status === "saved";
      status(
        saved ? "Export saved." : "Download started",
        [
          saved
            ? `${outcome.filename} in ${directoryHandle.name}`
            : `Requested: ${outcome.filename}`,
          `${result.metadata.messageCount} messages${result.omissions.length ? " · text-only copy" : ""}.`,
          ...(saved
            ? []
            : [
                "Open Chrome’s Downloads (Ctrl+J, or ⌘⇧J on Mac) to check the file. Completion isn’t confirmed here.",
              ]),
        ].join("\n"),
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
      if (code === "research-access" && error.researchOrigins) {
        researchOrigins = error.researchOrigins;
        $("export").textContent = "Allow Deep Research and export";
      }
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
    requestResearchPermission: (request) => chrome.permissions.request(request),
  });
}
