import { ExportError } from "./core.js";

export async function saveFile(
  blob,
  filename,
  {
    signal,
    timeout = 120000,
    directoryHandle,
    locks = globalThis.navigator?.locks,
  } = {},
) {
  if (signal?.aborted) throw new ExportError("cancelled");
  if (
    typeof filename !== "string" ||
    !filename ||
    /[/\\\u0000-\u001f\u007f<>:"|?*]/.test(filename) ||
    /[. ]$/.test(filename) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(filename)
  )
    throw new ExportError("save-interrupted");
  if (directoryHandle)
    return saveToDirectory(blob, filename, directoryHandle, {
      signal,
      timeout,
      locks,
    });

  let url,
    anchor,
    handedOff = false;
  try {
    url = URL.createObjectURL(blob);
    anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    if (signal?.aborted) throw new ExportError("cancelled");
    anchor.click();
    handedOff = true;
    // The browser owns the download after this click. Ordinary anchors cannot
    // observe completion, cancellation, or the final filename/location.
    return { status: "download-started", filename };
  } catch (error) {
    if (error instanceof ExportError) throw error;
    throw new ExportError("save-interrupted");
  } finally {
    anchor?.remove();
    if (url) {
      if (handedOff) {
        // Allow Chrome to consume the Blob before releasing it. Closing this
        // document also releases its object URLs; no persistent URL is kept.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else URL.revokeObjectURL(url);
    }
  }
}

async function saveToDirectory(
  blob,
  filename,
  directory,
  { signal, timeout, locks },
) {
  // A file stream's exclusive mode alone cannot protect the preceding filename
  // check. All extension windows must hold this same origin-wide lock.
  if (!locks?.request) throw new ExportError("save-interrupted");
  let writer, stopped, aborting;
  let rejectStopped;
  const interrupted = new Promise((_, reject) => {
    rejectStopped = reject;
  });
  interrupted.catch(() => {});
  const queued = new AbortController();
  const abortWriter = () => {
    if (writer && !aborting)
      aborting = Promise.resolve()
        .then(() => writer.abort())
        .catch(() => {});
    return aborting;
  };
  const stop = (code) => {
    if (stopped) return;
    stopped = new ExportError(code);
    queued.abort();
    rejectStopped(stopped);
    abortWriter();
  };
  const abort = () => stop("cancelled");
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => stop("save-timeout"), timeout);
  const check = () => {
    if (stopped) throw stopped;
  };
  const wait = (operation) => Promise.race([operation, interrupted]);
  try {
    const saving = locks.request(
      "simple-ai-chat-export-custom-save",
      { mode: "exclusive", signal: queued.signal },
      async () => {
        check();
        let committed = false;
        try {
          const dot = filename.lastIndexOf(".");
          const stem = dot > 0 ? filename.slice(0, dot) : filename;
          const suffix = dot > 0 ? filename.slice(dot) : "";
          let handle, name;
          for (let i = 0; i < 1000; i++) {
            check();
            name = i ? `${stem} (${i})${suffix}` : filename;
            try {
              // Check only candidate names; never enumerate or read a folder.
              await directory.getFileHandle(name);
              check();
            } catch (error) {
              check();
              if (error.name === "TypeMismatchError") continue;
              if (error.name !== "NotFoundError") throw error;
              handle = await directory.getFileHandle(name, { create: true });
              check();
              break;
            }
          }
          if (!handle) throw new ExportError("save-interrupted");
          // These uncancellable handle/open operations stay inside the lock
          // until they settle, even if the caller has already timed out.
          writer = await handle.createWritable({ mode: "exclusive" });
          check();
          await wait(writer.write(blob));
          check();
          await wait(writer.close());
          check();
          committed = true;
          return { status: "saved", filename: name };
        } finally {
          // Keep the lock until abort settles, so another window cannot race
          // a late-opening or interrupted stream.
          if (!committed) await abortWriter();
        }
      },
    );
    return await wait(saving);
  } catch (error) {
    if (stopped) throw stopped;
    if (error instanceof ExportError) throw error;
    throw new ExportError("save-interrupted");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
