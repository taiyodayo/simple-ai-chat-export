// Self-contained: Chrome serialises this function into the clicked tab's isolated world.
export async function readConversationPage(expectedUrl, reports = []) {
  const fail = (code) => {
    throw new Error(code);
  };
  const canonical = () =>
    location.origin + location.pathname.replace(/\/$/, "");
  const pause = () => new Promise((resolve) => setTimeout(resolve, 350));
  let scroller, originalTop;
  try {
    if (canonical() !== expectedUrl) fail("changed");
    // The URL identifies the conversation, not its rendering implementation.
    // History and guest pages can use either supported message layout.
    const selector =
      "[data-message-role], [data-message-author-role], [data-chatgpt-search-message-ids]";
    const visible = (e) =>
      !!e.getClientRects().length &&
      !e.closest('[hidden],[aria-hidden="true"]');
    const elements = () =>
      [...document.querySelectorAll(selector)].filter(
        (e) => visible(e) && !e.parentElement?.closest(selector),
      );
    let first = elements()[0];
    for (let attempt = 0; !first && attempt < 6; attempt++) {
      await pause();
      if (canonical() !== expectedUrl) fail("changed");
      first = elements()[0];
    }
    if (!first) fail("layout-unrecognized");
    const researchFrames = () =>
      elements().flatMap((e) =>
        [
          ...e.querySelectorAll(
            '[data-mcp-app-frame] iframe[title="Deep research"]',
          ),
        ].map((frame) => ({ url: frame.src })),
      );
    const frames = researchFrames();
    if (frames.some((frame) => !reports.some((r) => r.url === frame.url)))
      return { error: "research-access", researchFrames: frames };
    scroller = first.parentElement;
    while (
      scroller &&
      !(
        scroller.scrollHeight > scroller.clientHeight + 5 &&
        /auto|scroll/.test(getComputedStyle(scroller).overflowY)
      )
    )
      scroller = scroller.parentElement;
    scroller ??= document.scrollingElement;
    originalTop = scroller.scrollTop;
    const safeLink = (value) => {
      try {
        const url = new URL(value);
        return /^(http|https):$/.test(url.protocol) &&
          !url.username &&
          !url.password
          ? url.href
          : null;
      } catch {
        return null;
      }
    };
    function markdown(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName;
      if (
        node.matches(
          '[hidden],[aria-hidden="true"],[data-markdown-copy="exclude"],script,style,svg',
        )
      )
        return "";
      if (tag === "BUTTON")
        return node.hasAttribute("aria-haspopup")
          ? `[${node.getAttribute("aria-label") || node.textContent.trim()}]`
          : "";
      if (
        tag === "PRE" ||
        node.getAttribute("data-markdown-copy") === "code-block"
      ) {
        const code = node.querySelector("code") ?? node;
        const text = code.textContent;
        const fence = "`".repeat(
          Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)),
        );
        return (
          "\n\n" +
          fence +
          "\n" +
          text.replace(/\n$/, "") +
          "\n" +
          fence +
          "\n\n"
        );
      }
      if (
        tag === "CODE" ||
        node.getAttribute("data-markdown-copy") === "inline-code"
      ) {
        const text = node.textContent;
        const fence = "`".repeat(
          Math.max(1, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)),
        );
        return fence + " " + text + " " + fence;
      }
      if (tag === "TABLE") {
        const rows = [...node.querySelectorAll("tr")].map((row) =>
          [...row.querySelectorAll("th,td")].map((cell) =>
            markdownChildren(cell)
              .trim()
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " "),
          ),
        );
        if (!rows.length) return "";
        const width = Math.max(...rows.map((r) => r.length));
        const line = (r) =>
          "| " +
          Array.from({ length: width }, (_, i) => r[i] ?? "").join(" | ") +
          " |";
        return (
          "\n\n" +
          [
            line(rows[0]),
            line(Array(width).fill("---")),
            ...rows.slice(1).map(line),
          ].join("\n") +
          "\n\n"
        );
      }
      const text = markdownChildren(node);
      if (tag === "A") {
        const url = safeLink(node.href);
        return url ? text + " (" + url + ")" : text;
      }
      if (tag === "BR") return "\n";
      if (tag === "LI") return "\n- " + text.trim();
      if (/^H[1-6]$/.test(tag))
        return "\n\n" + "#".repeat(Number(tag[1])) + " " + text.trim() + "\n\n";
      if (tag === "BLOCKQUOTE")
        return (
          "\n\n" +
          text
            .trim()
            .split("\n")
            .map((l) => "> " + l)
            .join("\n") +
          "\n\n"
        );
      if (/^(P|DIV|UL|OL)$/.test(tag)) {
        const body = text.replace(/^\n+|\n+$/g, "");
        return body ? "\n\n" + body + "\n\n" : "";
      }
      return text;
    }
    function markdownChildren(node) {
      // Merge separators only at HTML-node boundaries. Never normalise the
      // interior of a code block or a user message.
      return [...node.childNodes].map(markdown).reduce((text, next) => {
        const trailing = /\n+$/.exec(text)?.[0].length ?? 0;
        const leading = /^\n+/.exec(next)?.[0].length ?? 0;
        if (trailing && leading)
          return (
            text.slice(0, -trailing) +
            "\n".repeat(Math.min(2, trailing + leading)) +
            next.slice(leading)
          );
        return text + next;
      }, "");
    }
    const snapshot = () => {
      if (canonical() !== expectedUrl) fail("changed");
      if (
        [
          ...document.querySelectorAll(
            '[data-testid="stop-button"],button[aria-label="Stop generating"],[aria-busy="true"]',
          ),
        ].some(visible)
      )
        fail("generating");
      const messages = elements().map((e) => {
        const modern = e.hasAttribute("data-chatgpt-search-message-ids");
        const guest = e.hasAttribute("data-message-role");
        const researchFrame = e.querySelector(
          '[data-mcp-app-frame] iframe[title="Deep research"]',
        );
        const role = modern
          ? e.querySelector("[data-user-message-bubble]")
            ? "user"
            : researchFrame ||
                e.querySelector('[data-conversation-role="assistant"]')
              ? "assistant"
              : null
          : e.getAttribute(
              guest ? "data-message-role" : "data-message-author-role",
            );
        if (!["user", "assistant"].includes(role)) fail("unsupported");
        const selection = modern
          ? e.querySelector("[data-chatgpt-selection-conversation-id]")
          : null;
        const ids = modern
          ? e
              .getAttribute("data-chatgpt-search-message-ids")
              .trim()
              .split(/\s+/)
          : [];
        if (
          modern &&
          (!ids.length ||
            ids.length > 1000 ||
            ids.some((id) => !/^[a-zA-Z0-9_-]{1,100}$/.test(id)))
        )
          fail("unsupported");
        const selectedId = selection?.getAttribute(
          "data-chatgpt-selection-message-id",
        );
        const grouped =
          modern && role === "assistant" && !selectedId && !researchFrame;
        const id = modern
          ? (role === "user" || researchFrame) && ids.length === 1
            ? ids[0]
            : selectedId || (grouped && selection ? `rendered-${ids[0]}` : null)
          : guest
            ? e.id
            : e.getAttribute("data-message-id");
        if (
          modern &&
          ((!grouped && !ids.includes(id)) ||
            (selection &&
              selection.getAttribute(
                "data-chatgpt-selection-conversation-id",
              ) !== new URL(expectedUrl).pathname.split("/").at(-1)))
        )
          fail("changed");
        if (
          modern &&
          e
            .closest("[data-talvt-turn-state]")
            ?.getAttribute("data-talvt-turn-state") !== "complete"
        )
          fail("generating");
        if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) fail("unsupported");
        if (researchFrame) {
          const report = reports.find((r) => r.url === researchFrame.src);
          if (!report) fail("changed");
          return {
            id,
            role,
            parts: report.parts,
            sources: report.sources,
            sourceMessageIds: [...new Set([id, report.messageId])],
          };
        }
        if (
          guest &&
          role === "assistant" &&
          !e.hasAttribute("data-message-complete")
        )
          fail("generating");
        const content = modern
          ? role === "user"
            ? e.querySelector("[data-user-message-bubble]")
            : selection?.querySelector("[data-markdown-text-style]")
          : guest
            ? e.querySelector(
                role === "user"
                  ? "[data-user-message-copy]"
                  : "[data-assistant-markdown]",
              )
            : e.querySelector(
                role === "assistant" ? ".markdown" : ".whitespace-pre-wrap",
              );
        if (!content) fail("unsupported");
        const text =
          role === "user" ? content.innerText : markdown(content).trim();
        if (!text.trim()) fail("unsupported");
        const parts = [{ type: "text", text }];
        for (const [selector, kind] of [
          ["img", "image"],
          ["audio", "audio"],
          ["video", "video"],
        ])
          if (content.querySelector(selector))
            parts.push({ type: "omission", kind });
        if (e.querySelector('[data-testid*="attachment"],a[download]'))
          parts.push({ type: "omission", kind: "attachment" });
        const sources = [...content.querySelectorAll("a[href]")]
          .map((a) => ({ title: a.textContent.trim(), url: safeLink(a.href) }))
          .filter((s) => s.url);
        return {
          id,
          role,
          parts,
          sources,
          ...(grouped ? { sourceMessageIds: ids } : {}),
        };
      });
      if (!messages.length) fail("incomplete");
      if (new Set(messages.map((m) => m.id)).size !== messages.length)
        fail("incomplete");
      if (JSON.stringify(messages).length > 20_000_000) fail("too-large");
      return messages;
    };
    const initial = snapshot();
    let previous = initial;
    // Require retained, overlapping messages; never quietly lose virtualised history.
    const retains = (before, after) => {
      const ids = after.map((m) => m.id);
      let index = -1;
      for (const m of before) {
        const next = ids.indexOf(m.id);
        if (next <= index) fail("incomplete");
        if (JSON.stringify(m) !== JSON.stringify(after[next])) fail("changed");
        index = next;
      }
    };
    const reversed =
      getComputedStyle(scroller).flexDirection === "column-reverse";
    for (const end of [false, true]) {
      let stable = 0;
      for (let attempt = 0; attempt < 20; attempt++) {
        const edge = reversed
          ? end
            ? 0
            : scroller.clientHeight - scroller.scrollHeight
          : end
            ? scroller.scrollHeight - scroller.clientHeight
            : 0;
        scroller.scrollTo({ top: edge, behavior: "instant" });
        await pause();
        const next = snapshot();
        retains(previous, next);
        stable =
          JSON.stringify(previous) === JSON.stringify(next) ? stable + 1 : 0;
        previous = next;
        const currentEdge = reversed
          ? end
            ? 0
            : scroller.clientHeight - scroller.scrollHeight
          : end
            ? scroller.scrollHeight - scroller.clientHeight
            : 0;
        const atEdge = Math.abs(scroller.scrollTop - currentEdge) <= 2;
        if (stable >= 2 && atEdge) break;
        if (attempt === 19) fail("incomplete");
      }
    }
    retains(initial, previous);
    return {
      messages: previous,
      title:
        document.title.replace(/\s*[-–|]\s*ChatGPT\s*$/, "").trim() ||
        "ChatGPT conversation",
    };
  } catch (error) {
    return {
      error: [
        "changed",
        "empty",
        "layout-unrecognized",
        "generating",
        "unsupported",
        "incomplete",
        "too-large",
      ].includes(error.message)
        ? error.message
        : "incomplete",
    };
  } finally {
    if (scroller && originalTop !== undefined)
      scroller.scrollTo({ top: originalTop, behavior: "instant" });
  }
}
