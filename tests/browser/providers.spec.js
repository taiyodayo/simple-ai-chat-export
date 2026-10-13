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
    expect(text).toContain("| ` Tea ` | ` 2 ` |");
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

test("Claude reads a windowed transcript whose far rows are unmounted", async ({
  page,
}) => {
  const url = "https://claude.ai/chat/11111111-1111-4111-8111-111111111111";
  const rowHeight = 400;
  const turns = 5;
  await page.route(new URL(url).origin + "/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<title>Windowed chat - Claude</title><div id="scroller" style="height:300px;overflow-y:auto"><div id="sizer" style="position:relative"></div></div><script>
const rows = [];
for (let turn = 0; turn < ${turns}; turn++) {
  rows.push('<div data-cds="UserMessage" data-turn-key="turn-' + turn + '"><div data-testid="user-message"><div style="display:contents"><p style="white-space:pre-wrap">Same question again</p></div></div></div>');
  rows.push('<div data-testid="assistant-message" data-turn-key="turn-' + turn + '-reply" data-is-streaming="false"><div class="standard-markdown"><p>Reply number ' + turn + '</p></div></div>');
}
const scroller = document.getElementById("scroller");
const sizer = document.getElementById("sizer");
function render() {
  const from = scroller.scrollTop - 100, to = scroller.scrollTop + 300 + 100;
  const mounted = rows.map((_, i) => i).filter((i) => i * ${rowHeight} < to && (i + 1) * ${rowHeight} > from);
  const first = mounted[0], last = mounted[mounted.length - 1];
  sizer.innerHTML = '<div data-testid="transcript-spacer" style="height:' + first * ${rowHeight} + 'px"></div>' +
    mounted.map((i) => '<div data-testid="transcript-row" style="height:${rowHeight}px;box-sizing:border-box">' + rows[i] + '</div>').join("") +
    '<div data-testid="transcript-spacer" style="height:' + (rows.length - last - 1) * ${rowHeight} + 'px"></div>';
}
scroller.addEventListener("scroll", render);
render();
scroller.scrollTop = scroller.scrollHeight;
</script>`,
    }),
  );
  await page.goto(url);
  const mountedAtBottom = await page.evaluate(
    () =>
      document.querySelectorAll(
        '[data-testid="user-message"],[data-testid="assistant-message"]',
      ).length,
  );
  expect(mountedAtBottom).toBeLessThan(turns * 2);
  const before = await page.evaluate(
    () => document.getElementById("scroller").scrollTop,
  );
  expect(before).toBeGreaterThan(0);
  const result = await page.evaluate(readConversationPage, url);
  expect(result.error).toBeUndefined();
  expect(result.messages.map((m) => m.id)).toEqual(
    Array.from({ length: turns }, (_, turn) => [
      `turn-${turn}`,
      `turn-${turn}-reply`,
    ]).flat(),
  );
  expect(result.messages.map((m) => m.parts[0].text)).toEqual(
    Array.from({ length: turns }, (_, turn) => [
      "Same question again",
      `Reply number ${turn}`,
    ]).flat(),
  );
  // The original position is restored after the walk.
  expect(
    await page.evaluate(() => document.getElementById("scroller").scrollTop),
  ).toBe(before);
  const again = await page.evaluate(readConversationPage, url);
  expect(again.messages).toEqual(result.messages);
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

test("Gemini keeps Maps place chips and cards with their place URLs", async ({
  page,
}) => {
  const url = "https://gemini.google.com/app/0123456789abcdef";
  const placeId = "ChIJqX7xv2HKHmARAEZ81K-FMnQ";
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  const chip = (name) =>
    `<response-element><map-location-reference-link-block><button role="link" class="link-button"><span>${name}</span><span class="cdk-visually-hidden non-selectable">Click to open side panel for more information</span></button></map-location-reference-link-block></response-element>`;
  const card =
    '<div class="attachment-container"><response-element><rich-list-card><div class="entity-heading"><button class="card-data clickable" jslog="350005;track:generic_click,impression;BardVeMetadataKey:W251bGwsbnVsbCxbIm1hcF9sb2NhdGlvbl9yaWNoX2xpc3RfY2FyZF9DaElKcVg3eHYySEtIbUFSQUVaODFLLUZNblEiXV0=;index:2"><div class="thumbnail-wrapper"><img role="presentation" class="thumbnail" src="https://example.invalid/thumb.jpg"></div><div class="details"><div class="card-info"><div class="title">浦山ダム</div><rich-list-row><div class="row"><span class="row-text"><span class="cdk-visually-hidden">4.1 stars rating</span><span aria-hidden="true">4.1</span></span><span class="row-icon-wrapper"><img alt="" role="presentation" class="row-icon" src="https://www.gstatic.com/gemini/maps/star.png"></span></div></rich-list-row><rich-list-row><div class="row"><span class="row-text"> Open </span><span class="row-text"> · Closes 5:00 PM Sun </span></div></rich-list-row></div></div></button><selection-button><label><input type="checkbox" aria-label="Select 浦山ダム"></label></selection-button></div></rich-list-card></response-element></div>';
  await page.route(new URL(url).origin + "/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<title>Places - Gemini</title><main><user-query><div class="query-text">Where?</div></user-query><model-response><message-content><div class="markdown" aria-busy="false"><h3>Spots</h3>${card}<p>${chip("浦山ダム")}は、巨大なダムです。</p><p>${chip("未知の場所")}は、カードがありません。</p></div></message-content></model-response></main>`,
    }),
  );
  await page.goto(url);
  const result = await page.evaluate(readConversationPage, url);
  expect(result.error).toBeUndefined();
  const text = result.messages[1].parts[0].text;
  expect(text).toContain(
    `浦山ダム (${mapsUrl}) — 4.1 ★ · Open · Closes 5:00 PM Sun`,
  );
  expect(text).toContain(`浦山ダム (${mapsUrl})は、巨大なダムです。`);
  expect(text).toContain("未知の場所は、カードがありません。");
  expect(text).not.toContain("Click to open");
  expect(text).not.toContain("stars rating");
  expect(text).not.toContain("Select ");
  expect(result.messages[1].sources).toEqual([
    { title: "浦山ダム", url: mapsUrl },
  ]);
});
