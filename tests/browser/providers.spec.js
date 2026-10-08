import { test, expect } from "@playwright/test";
import { readConversationPage } from "../../extension/page-reader.js";

const body =
  '<p>日本語 ☕ <strong>bold</strong> <em>emphasis</em></p><pre><code>  first\n\n\n  second</code></pre><table><tr><th>Item</th><th>Count</th></tr><tr><td>Tea</td><td>2</td></tr></table><a href="https://example.org/source">Source</a>';
async function providerChat(page, provider) {
  const claude = provider === "Claude";
  const url = claude
    ? "https://claude.ai/chat/11111111-1111-4111-8111-111111111111"
    : "https://gemini.google.com/app/0123456789abcdef";
  const user = claude
    ? '<div data-testid="user-message"><div style="display:contents"><p style="white-space:pre-wrap">First line\n  indented</p><p>Another paragraph</p></div></div>'
    : '<user-query><div class="query-text" style="white-space:pre-wrap">First line\n  indented</div></user-query>';
  const answer = claude
    ? `<div data-testid="assistant-message" data-turn-key="answer-1" data-is-streaming="false"><h2 class="sr-only">DO NOT EXPORT THIS LABEL</h2><div class="standard-markdown">${body}</div><div data-testid="message-actions">DO NOT EXPORT THESE ACTIONS</div></div>`
    : `<model-response><message-content><div class="markdown" aria-busy="false">${body}</div></message-content><aside>DO NOT EXPORT THESE ACTIONS</aside></model-response>`;
  await page.route(new URL(url).origin + "/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<title>Test chat - ${provider}</title><main>${user}${answer}</main>`,
    }),
  );
  await page.goto(url);
  return url;
}
for (const provider of ["Claude", "Gemini"]) {
  test(`${provider} preserves message content and excludes interface controls`, async ({
    page,
  }) => {
    const url = await providerChat(page, provider);
    const result = await page.evaluate(readConversationPage, url);
    expect(result.error).toBeUndefined();
    expect(result.title).toBe("Test chat");
    expect(result.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(result.messages[0].parts[0].text).toContain(
      "First line\n  indented",
    );
    const text = result.messages[1].parts[0].text;
    expect(text).toContain("日本語 ☕");
    expect(text).toContain("**bold** *emphasis*");
    expect(text).toContain("  first\n\n\n  second");
    expect(text).toContain("| Tea | 2 |");
    expect(text).not.toContain("DO NOT EXPORT");
    expect(result.messages[1].sources[0].url).toBe(
      "https://example.org/source",
    );
    const again = await page.evaluate(readConversationPage, url);
    expect(again.messages).toEqual(result.messages);
  });
  test(`${provider} stops for generation, changed replies and unknown content boundaries`, async ({
    page,
  }) => {
    const url = await providerChat(page, provider);
    await page.evaluate(() => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", "Stop response");
      document.body.append(b);
    });
    expect((await page.evaluate(readConversationPage, url)).error).toBe(
      "generating",
    );
    await page.evaluate(() => {
      document.querySelector("button").remove();
      setTimeout(() => {
        document.querySelector(".standard-markdown,.markdown").textContent =
          "A changed reply";
      }, 100);
    });
    expect(["changed", "incomplete"]).toContain(
      (await page.evaluate(readConversationPage, url)).error,
    );
    await page.evaluate(() =>
      document.querySelector(".standard-markdown,.markdown").remove(),
    );
    expect((await page.evaluate(readConversationPage, url)).error).toBe(
      "unsupported",
    );
  });
}
test("Claude requires an explicit completed reply and handles duplicate user messages", async ({
  page,
}) => {
  const url = await providerChat(page, "Claude");
  await page.evaluate(() =>
    document
      .querySelector('[data-testid="assistant-message"]')
      .removeAttribute("data-is-streaming"),
  );
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "generating",
  );
  await page.evaluate(() => {
    document
      .querySelector('[data-testid="assistant-message"]')
      .setAttribute("data-is-streaming", "false");
    const user = document.querySelector('[data-testid="user-message"]');
    user.after(user.cloneNode(true));
  });
  const result = await page.evaluate(readConversationPage, url);
  expect(result.messages).toHaveLength(3);
  expect(new Set(result.messages.map((m) => m.id)).size).toBe(3);
});

test("Gemini requires completed Markdown, including when no stop button is visible", async ({
  page,
}) => {
  const url = await providerChat(page, "Gemini");
  await page.evaluate(() =>
    document
      .querySelector("message-content .markdown")
      .setAttribute("aria-busy", "true"),
  );
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "generating",
  );
  await page.evaluate(() =>
    document
      .querySelector("message-content .markdown")
      .removeAttribute("aria-busy"),
  );
  expect((await page.evaluate(readConversationPage, url)).error).toBe(
    "generating",
  );
});
