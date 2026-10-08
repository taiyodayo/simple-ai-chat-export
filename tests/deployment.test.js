import test from "node:test";
import assert from "node:assert/strict";
import worker from "../deployment/worker.js";

test("support worker serves only its known paths with restrictive headers", async () => {
  const fetched = [];
  const env = {
    ASSETS: {
      fetch: async (req) => {
        fetched.push(new URL(req.url).pathname);
        return new Response("Synthetic page");
      },
    },
  };
  const page = await worker.fetch(
    new Request(
      "https://ongaku.co.uk/simple-chatgpt-exporter?anything=discarded",
    ),
    env,
  );
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  assert.match(page.headers.get("cache-control"), /no-transform/);
  assert.match(
    page.headers.get("content-security-policy"),
    /default-src 'none'/,
  );
  assert.deepEqual(fetched, ["/index.html"]);
  const privacy = await worker.fetch(
    new Request("https://ongaku.co.uk/simple-chatgpt-exporter/privacy"),
    env,
  );
  assert.equal(privacy.status, 200);
  assert.equal(fetched.at(-1), "/privacy.html");
  for (const [path, asset] of [
    ["/simple-ai-chat-export", "/index.html"],
    ["/simple-ai-chat-export/", "/index.html"],
    ["/simple-ai-chat-export/styles.css", "/styles.css"],
    ["/simple-ai-chat-export/privacy", "/privacy.html"],
    ["/simple-ai-chat-export/privacy/", "/privacy.html"],
  ]) {
    const response = await worker.fetch(
      new Request("https://ongaku.co.uk" + path),
      env,
    );
    assert.equal(response.status, 200);
    assert.equal(fetched.at(-1), asset);
  }
  for (const path of [
    "/",
    "/some-other-project",
    "/simple-chatgpt-exporter-unrelated",
    "/simple-chatgpt-exporter/private",
    "/simple-ai-chat-export-unrelated",
    "/simple-ai-chat-export/private",
  ]) {
    const response = await worker.fetch(
      new Request("https://ongaku.co.uk" + path),
      env,
    );
    assert.equal(response.status, 404);
  }
  assert.equal(
    (
      await worker.fetch(
        new Request("https://ongaku.co.uk/simple-chatgpt-exporter", {
          method: "POST",
          body: "no",
        }),
        env,
      )
    ).status,
    405,
  );
  assert.equal(fetched.length, 7);
});
