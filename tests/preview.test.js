import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

async function launch(t, port) {
  const child = spawn(process.execPath, ["scripts/preview.js"], {
    cwd: new URL("../", import.meta.url),
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
