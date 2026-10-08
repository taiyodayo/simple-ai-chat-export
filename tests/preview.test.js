import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

async function launch(t, port, cwd = new URL("../", import.meta.url)) {
  const child = spawn(process.execPath, ["scripts/preview.js"], {
    cwd,
    env: { ...process.env, PREVIEW_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exited = once(child, "exit");
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await exited;
  });
  let output = "",
    errors = "";
  child.stderr.on("data", (chunk) => {
    errors += chunk;
  });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Preview startup timed out")),
      5000,
    );
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Preview: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", () => {
      clearTimeout(timer);
      reject(new Error(errors || "Preview exited before starting"));
    });
  });
  return { url, output, errors };
}

test("preview starts and serves the app at its printed URL", async (t) => {
  const { url, errors } = await launch(t, 0);
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Simple AI-Chat export/);
  assert.equal((await fetch(`${url}/simple-chatgpt-exporter`)).status, 200);
  assert.equal(errors, "");
});

test("only approved assets and loopback requests are served", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "simple-ai-chat-preview-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = new URL("../", import.meta.url);
  for (const name of ["extension", "dev", "site"])
    await cp(new URL(name, root), join(dir, name), { recursive: true });
  for (const name of ["scripts", "tests"]) await mkdir(join(dir, name));
  await cp(
    new URL("scripts/preview.js", root),
    join(dir, "scripts/preview.js"),
  );
  await cp(new URL("tests/fixtures.js", root), join(dir, "tests/fixtures.js"));
  await writeFile(join(dir, "package.json"), '{"type":"module"}');
  const marker = "PRIVATE_SYNTHETIC_MARKER";
  await writeFile(join(dir, "private.txt"), marker);
  await writeFile(join(dir, "site/unapproved.txt"), marker);
  await rm(join(dir, "extension/core.js"));
  await symlink(join(dir, "private.txt"), join(dir, "extension/core.js"));
  const { url } = await launch(t, 0, dir);
  const send = (path, options = {}) =>
    new Promise((resolve, reject) => {
      const req = request(url, { path, ...options }, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode, body, headers: res.headers }),
        );
      });
      req.on("error", reject);
      req.end();
    });
  for (const path of [
    "/private.txt",
    "/site/unapproved.txt",
    "/tests/preview.test.js",
    "/extension/core.js",
    "/../private.txt",
    "/site/../index.html",
    "/%2e%2e/private.txt",
    "/site/%2e%2e/index.html",
    "/%ZZ",
  ]) {
    const result = await send(path);
    assert.equal(result.status, 404, path);
    assert.ok(!result.body.includes(marker));
  }
  assert.equal(
    (await send("/", { headers: { Host: "attacker.invalid" } })).status,
    403,
  );
  for (const method of ["POST", "PUT"])
    assert.equal((await send("/", { method })).status, 405);
  const head = await send("/", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
  assert.ok(head.headers["content-type"].includes("text/html"));
  for (const base of ["/simple-ai-chat-export", "/simple-chatgpt-exporter"])
    for (const suffix of [
      "",
      "/",
      "/privacy",
      "/privacy/",
      "/styles.css",
      "/favicon.png",
    ])
      assert.equal((await send(base + suffix)).status, 200);
});

test("an occupied port selects another port without disrupting its owner", async (t) => {
  const occupied = createServer((req, res) => res.end("Existing application"));
  occupied.listen(0, "127.0.0.1");
  await once(occupied, "listening");
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  const port = occupied.address().port;
  const { url, output, errors } = await launch(t, port);
  assert.notEqual(new URL(url).port, String(port));
  assert.match(output, /is in use/);
  assert.equal(errors, "");
  assert.match(await (await fetch(url)).text(), /Simple AI-Chat export/);
  assert.equal(
    await (await fetch(`http://127.0.0.1:${port}`)).text(),
    "Existing application",
  );
});
