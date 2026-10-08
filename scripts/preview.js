import { createServer } from "node:http";
import { open, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, extname } from "node:path";
const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
// Load only reviewed preview assets. Requests never choose filesystem paths.
const assets = new Map();
for (const source of [
  "extension/popup.html",
  "extension/popup.js",
  "extension/popup.css",
  "extension/core.js",
  "extension/save.js",
  "extension/page-reader.js",
  "extension/retrieval.js",
  "extension/research.js",
  "extension/help.html",
  "extension/help.js",
  "dev/preview.js",
  "tests/fixtures.js",
  "site/index.html",
  "site/privacy.html",
  "site/styles.css",
  "site/favicon.png",
]) {
  const target = join(root, source);
  let handle;
  try {
    if ((await realpath(target)) !== target) continue;
    handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    assets.set(`/${source}`, {
      body: await handle.readFile(),
      type: types[extname(source)] ?? "text/plain",
    });
  } catch {
    // Missing or symlinked assets are unavailable, never followed elsewhere.
  } finally {
    await handle?.close();
  }
}
const popup = assets.get("/extension/popup.html");
if (popup)
  assets.set("/dev/index.html", {
    ...popup,
    body: popup.body
      .toString("utf8")
      .replace('href="popup.css"', 'href="/extension/popup.css"')
      .replace('src="popup.js"', 'src="/dev/preview.js"')
      .replace('href="help.html"', 'href="/extension/help.html"'),
  });
assets.set("/", assets.get("/dev/index.html"));
for (const base of ["/simple-ai-chat-export", "/simple-chatgpt-exporter"])
  for (const [route, source] of [
    ["", "index.html"],
    ["/", "index.html"],
    ["/privacy", "privacy.html"],
    ["/privacy/", "privacy.html"],
    ["/styles.css", "styles.css"],
    ["/favicon.png", "favicon.png"],
  ])
    assets.set(base + route, assets.get(`/site/${source}`));

const server = createServer((req, res) => {
  try {
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host) return res.writeHead(403).end();
    if (!["GET", "HEAD"].includes(req.method))
      return res.writeHead(405, { Allow: "GET, HEAD" }).end();
    const origin = `http://${host}`;
    const url = new URL(req.url, origin);
    const segments = decodeURIComponent(req.url.split("?")[0]).split("/");
    if (
      url.origin !== origin ||
      segments.includes("..") ||
      segments.includes(".")
    )
      return res.writeHead(404).end();
    const asset = assets.get(url.pathname);
    if (!asset) return res.writeHead(404).end();
    res
      .writeHead(200, {
        "Content-Type": asset.type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      })
      .end(req.method === "HEAD" ? undefined : asset.body);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

const requestedPort = Number(process.env.PREVIEW_PORT ?? 4173);
let port = requestedPort;
let retries = 0;
server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && retries < 10 && port < 65535) {
    if (retries === 0)
      console.log(`Port ${port} is in use; finding an available preview port.`);
    retries++;
    server.listen(++port, "127.0.0.1");
    return;
  }
  console.error(
    error.code === "EADDRINUSE"
      ? "No preview port is available. Try PREVIEW_PORT=4200 pnpm preview."
      : `Could not start the preview (${error.code ?? "unknown error"}). Try a different PREVIEW_PORT.`,
  );
  process.exitCode = 1;
});
server.on("listening", () => {
  console.log(`Preview: http://127.0.0.1:${server.address().port}`);
  console.log("Press Ctrl+C to stop.");
});
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error("PREVIEW_PORT must be a whole number between 0 and 65535.");
  process.exitCode = 1;
} else server.listen(port, "127.0.0.1");
