// Minimal ZIP writer: UTF-8, stored entries, no compression or dependencies.
// Two fixed relative entry names; conversation content cannot supply paths.
const encoder = new TextEncoder();
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function header(length) {
  const bytes = new Uint8Array(length),
    view = new DataView(bytes.buffer);
  return {
    bytes,
    word: (at, n) => view.setUint16(at, n, true),
    long: (at, n) => view.setUint32(at, n, true),
  };
}
export function archiveBytes(entries) {
  const local = [],
    central = [];
  let offset = 0,
    centralSize = 0;
  if (!entries.length || entries.length > 100)
    throw new Error("Invalid archive");
  for (const [name, text] of entries) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(name) || name.startsWith("."))
      throw new Error("Invalid entry name");
    const filename = encoder.encode(name),
      data = text instanceof Uint8Array ? text : encoder.encode(text);
    if (data.length > 100_000_000) throw new Error("Archive entry too large");
    const crc = crc32(data),
      lh = header(30),
      ch = header(46);
    lh.long(0, 0x04034b50);
    lh.word(4, 20);
    lh.word(6, 0x0800);
    lh.word(12, 33);
    lh.long(14, crc);
    lh.long(18, data.length);
    lh.long(22, data.length);
    lh.word(26, filename.length);
    ch.long(0, 0x02014b50);
    ch.word(4, 20);
    ch.word(6, 20);
    ch.word(8, 0x0800);
    ch.word(14, 33);
    ch.long(16, crc);
    ch.long(20, data.length);
    ch.long(24, data.length);
    ch.word(28, filename.length);
    ch.long(42, offset);
    local.push(lh.bytes, filename, data);
    central.push(ch.bytes, filename);
    offset += 30 + filename.length + data.length;
    centralSize += 46 + filename.length;
  }
  const end = header(22);
  end.long(0, 0x06054b50);
  end.word(8, entries.length);
  end.word(10, entries.length);
  end.long(12, centralSize);
  end.long(16, offset);
  const result = new Uint8Array(offset + centralSize + 22);
  let position = 0;
  for (const part of [...local, ...central, end.bytes]) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}
export function exportArchive(result, format) {
  return new Blob(
    [
      archiveBytes([
        [`conversation.${format}`, result.transcript],
        ["metadata.json", JSON.stringify(result.metadata, null, 2) + "\n"],
      ]),
    ],
    { type: "application/zip" },
  );
}
