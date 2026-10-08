export function researchFixture() {
  const token = "\uE200cite\uE202turn0search0\uE201";
  const report = `# Research 日本語 ☕

**Findings** ${token}.

| Item | Count |
| --- | --- |
| Tea | 2 |

\`\`\`js
  keep indentation


  keep spacing
\`\`\`

Again ${token}.`;
  const references = [...report.matchAll(new RegExp(token, "g"))].map((m) => ({
    type: "grouped_webpages",
    start: m.index,
    end: m.index + token.length,
    matched: token,
    status: "done",
    items: [{ title: "Primary source", url: "https://example.org/research" }],
  }));
  references.push({
    type: "sources_footnote",
    start: report.length,
    end: report.length,
    matched: "Sources",
    sources: [
      { title: "Additional source", url: "https://example.org/additional" },
    ],
  });
  return {
    report,
    messageId: "research-report-1",
    completedAt: 1,
    references,
    hasImages: false,
  };
}

export function frameProps(data) {
  return {
    report: data.report,
    reportMessageId: data.messageId,
    runCompletedAtMs: data.completedAt,
    contentReferences: data.references.map((r) => ({
      type: r.type,
      start_idx: r.start,
      end_idx: r.end,
      matched_text: r.matched,
      status: r.status,
      items: r.items,
      sources: r.sources,
      has_images: r.hasImages,
    })),
  };
}
