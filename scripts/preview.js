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
createServer(async (req, res) => {
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
}).listen(4173, "127.0.0.1", () =>
  console.log("Preview: http://127.0.0.1:4173"),
);
