import { test, expect } from "@playwright/test";
import { readConversationPage } from "../../extension/page-reader.js";

const chatUrl = "https://chatgpt.com/c/11111111-1111-4111-8111-111111111111";

async function conversation(page, content) {
  await page.route(chatUrl, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<title>Synthetic security test - ChatGPT</title>
      <div data-message-author-role="user" data-message-id="user-1"><div class="whitespace-pre-wrap">Please preserve the text.</div></div>
      <div data-message-author-role="assistant" data-message-id="assistant-1"><div class="markdown">${content}</div></div>`,
    }),
  );
  await page.goto(chatUrl);
}

for (const [name, markup] of [
  ["code block", "<pre><code></code></pre>"],
  ["inline code", "<code></code>"],
]) {
  test(`many separate backtick runs in ${name} export without argument overflow`, async ({
    page,
  }) => {
    await conversation(page, markup);
    const text = "`a".repeat(130000);
    await page.locator("code").evaluate((element, value) => {
      element.textContent = value;
    }, text);
    const result = await page.evaluate(readConversationPage, chatUrl);
    expect(result.error).toBeUndefined();
    expect(result.messages[1].parts[0].text).toContain(text);
  });
}

test("deeply nested rendered markup stops with a size error before recursive overflow", async ({
  page,
}) => {
  await conversation(page, "<span>Nested content</span>");
  await page.locator(".markdown").evaluate((root) => {
    let parent = root;
    for (let depth = 0; depth < 150; depth++) {
      const child = document.createElement("span");
      parent.append(child);
      parent = child;
    }
    parent.textContent = "Synthetic nested text";
  });
  expect((await page.evaluate(readConversationPage, chatUrl)).error).toBe(
    "too-large",
  );
});

test("a ragged table cannot allocate an excessive rectangular Markdown result", async ({
  page,
}) => {
  const wide = `<tr>${"<td>x</td>".repeat(1000)}</tr>`;
  const narrow = "<tr><td>y</td></tr>".repeat(1000);
  await conversation(page, `<table>${wide}${narrow}</table>`);
  expect((await page.evaluate(readConversationPage, chatUrl)).error).toBe(
    "too-large",
  );
});

test("table cells fence literal backslashes, pipes, backticks and HTML-like text", async ({
  page,
}) => {
  await conversation(
    page,
    '<table><tr><th>Literal</th><th>Code</th></tr><tr><td></td><td><code></code></td></tr></table><a href="https://example.org/source">Source</a>',
  );
  await page
    .locator("td")
    .nth(0)
    .evaluate((element) => {
      element.textContent = "a \\| b 日本語";
    });
  await page.locator("td code").evaluate((element) => {
    element.textContent = "`C:\\Users|<img>`";
  });
  const result = await page.evaluate(readConversationPage, chatUrl);
  expect(result.error).toBeUndefined();
  const text = result.messages[1].parts[0].text;
  expect(text).toContain(
    "| ` a \\\\| b 日本語 ` | `` `C:\\Users\\|<img>` `` |",
  );
  expect(result.messages[1].sources[0].url).toBe("https://example.org/source");
  expect(await page.locator("img").count()).toBe(0);
});
