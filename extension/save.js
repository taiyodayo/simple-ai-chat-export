import { ExportError } from "./core.js";

export async function saveFile(
  blob,
  filename,
  {
    signal,
    timeout = 120000,
    directoryHandle,
    downloads = globalThis.chrome?.downloads,
  } = {},
) {
  if (directoryHandle)
    return saveToDirectory(blob, filename, directoryHandle, {
      signal,
      timeout,
    });
  signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  let id,
    timer,
    listener,
    abort,
    expired = false;
  const events = new Map();
  let resolveDone, rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  // Attach immediately so cancellation while the save dialogue is open cannot
  // create an unhandled rejection before downloads.download resolves.
  done.catch(() => {});
  function observe(item) {
    const state = item.state?.current ?? item.state;
    if (state === "complete") resolveDone();
    if (state === "interrupted")
      rejectDone(new ExportError("save-interrupted"));
  }
  try {
    listener = (delta) => {
      if (id === undefined) {
        if (events.size < 100 && delta.state)
          events.set(delta.id, { state: delta.state });
      } else if (delta.id === id) observe(delta);
    };
    downloads.onChanged.addListener(listener);
    abort = () => {
      expired = true;
      rejectDone(new ExportError("cancelled"));
      if (id !== undefined) downloads.cancel(id).catch(() => {});
    };
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => {
      expired = true;
      rejectDone(new ExportError("save-timeout"));
      if (id !== undefined) downloads.cancel(id).catch(() => {});
    }, timeout);
    const starting = downloads.download({
      url,
      filename,
      saveAs: false,
      conflictAction: "uniquify",
    });
    // A closed window/timeout must still cancel a late-starting download.
    starting.then(
      (lateId) => {
        if (expired) downloads.cancel(lateId).catch(() => {});
      },
      () => {},
    );
    id = await Promise.race([starting, done]);
    if (!Number.isInteger(id)) throw new ExportError("save-interrupted");
    if (expired || signal?.aborted) throw new ExportError("cancelled");
    if (events.has(id)) observe(events.get(id));
    // Close the race between completion and registration. Query only our ID.
    const items = await Promise.race([
      downloads.search({ id }),
      done.then(() => []),
    ]);
    const [item] = items;
    if (item) observe(item);
    await done;
    return id;
  } catch (error) {
    if (id !== undefined) await downloads.cancel(id).catch(() => {});
    if (error instanceof ExportError) throw error;
    throw new ExportError("save-interrupted");
  } finally {
    clearTimeout(timer);
    if (listener) downloads.onChanged.removeListener(listener);
    signal?.removeEventListener("abort", abort);
    events.clear();
    URL.revokeObjectURL(url);
  }
}

async function saveToDirectory(blob, filename, directory, { signal, timeout }) {
  signal?.throwIfAborted();
  if (
    !filename ||
    /[/\\\u0000-\u001f]/.test(filename) ||
    [".", ".."].includes(filename)
  )
    throw new ExportError("save-interrupted");
  let writer, stopped;
  let rejectStopped;
  const interrupted = new Promise((_, reject) => {
    rejectStopped = reject;
  });
  interrupted.catch(() => {});
  const stop = (code) => {
    if (stopped) return;
    stopped = new ExportError(code);
    rejectStopped(stopped);
    writer?.abort().catch(() => {});
  };
  const abort = () => stop("cancelled");
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => stop("save-timeout"), timeout);
  const wait = (operation) => Promise.race([operation, interrupted]);
  try {
    const dot = filename.lastIndexOf(".");
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const suffix = dot > 0 ? filename.slice(dot) : "";
    let handle, name;
    for (let i = 0; i < 1000; i++) {
      if (stopped) throw stopped;
      name = i ? `${stem} (${i})${suffix}` : filename;
      try {
        // Check only candidate names. Do not read or enumerate folder contents.
        await wait(directory.getFileHandle(name));
      } catch (error) {
        if (error.name === "TypeMismatchError") continue;
        if (error.name !== "NotFoundError") throw error;
        handle = await wait(directory.getFileHandle(name, { create: true }));
        break;
      }
    }
    if (!handle) throw new ExportError("save-interrupted");
    const opening = handle.createWritable({ mode: "exclusive" });
    opening.then(
      (lateWriter) => {
        if (stopped) lateWriter.abort().catch(() => {});
      },
      () => {},
    );
    writer = await wait(opening);
    await wait(writer.write(blob));
    if (stopped) throw stopped;
    await wait(writer.close());
    signal?.throwIfAborted();
    return name;
  } catch (error) {
    writer?.abort().catch(() => {});
    if (stopped) throw stopped;
    if (error instanceof ExportError) throw error;
    throw new ExportError("save-interrupted");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
