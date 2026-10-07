import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const allowed = ["extension", "dev", "tests", "site"];
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  try {
    let path = new URL(req.url, "http://127.0.0.1").pathname;
    if (path === "/") path = "/dev/index.html";
    if (
      path === "/simple-chatgpt-exporter" ||
      path === "/simple-chatgpt-exporter/"
    )
      path = "/site/index.html";
    if (path === "/simple-chatgpt-exporter/styles.css")
      path = "/site/styles.css";
    const target = resolve(root, `.${decodeURIComponent(path)}`);
    if (!allowed.some((dir) => target.startsWith(resolve(root, dir) + sep))) {
      res.writeHead(404).end();
      return;
    }
    let content;
    if (path === "/dev/index.html") {
      content = (await readFile(resolve(root, "extension/popup.html"), "utf8"))
        .replace('href="popup.css"', 'href="/extension/popup.css"')
        .replace('src="popup.js"', 'src="/dev/preview.js"')
        .replace('href="help.html"', 'href="/extension/help.html"');
    } else content = await readFile(target);
    res
      .writeHead(200, {
        "Content-Type": types[extname(path)] ?? "text/plain",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      })
      .end(content);
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
