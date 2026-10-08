import test from "node:test";
import assert from "node:assert/strict";
import { formatResearchReport, researchOrigin } from "../extension/research.js";
import { researchFixture } from "./research-fixture.js";

test("research Markdown retains formatting and replaces citations with numbered source URLs", () => {
  const result = formatResearchReport(researchFixture());
  assert.match(result.parts[0].text, /\*\*Findings\*\* \[1\]/);
  assert.match(result.parts[0].text, /Again \[1\]/);
  assert.ok(
    result.parts[0].text.includes("  keep indentation\n\n\n  keep spacing"),
  );
  assert.ok(result.parts[0].text.includes("| Tea | 2 |"));
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].url, "https://example.org/research");
  assert.match(result.sources[0].title, /^\[1\]/);
  assert.doesNotMatch(result.parts[0].text, /[\uE200-\uE202]/);
});

test("research images are reported as omissions", () => {
  const data = researchFixture();
  data.hasImages = true;
  assert.deepEqual(formatResearchReport(data).parts[1], {
    type: "omission",
    kind: "image",
  });
});

for (const [name, mutate] of [
  [
    "unknown references",
    (d) => {
      d.references[0].type = "unknown";
    },
  ],
  [
    "inaccurate offsets",
    (d) => {
      d.references[0].start++;
    },
  ],
  [
    "overlapping references",
    (d) => {
      d.references.push(d.references[0]);
    },
  ],
  [
    "unsafe URLs",
    (d) => {
      d.references[0].items[0].url = "javascript:alert(1)";
    },
  ],
  [
    "credentials in URLs",
    (d) => {
      d.references[0].items[0].url = "https://user:password@example.org";
    },
  ],
  [
    "unresolved citations",
    (d) => {
      d.references.shift();
    },
  ],
  [
    "unfinished references",
    (d) => {
      d.references[0].status = "loading";
    },
  ],
  [
    "a source footer outside the report",
    (d) => {
      d.references.at(-1).start++;
      d.references.at(-1).end++;
    },
  ],
])
  test(`research rejects ${name}`, () => {
    const data = researchFixture();
    mutate(data);
    assert.throws(() => formatResearchReport(data), {
      code: "research-unrecognized",
    });
  });

test("research permission patterns accept only HTTPS sandbox app origins", () => {
  assert.equal(
    researchOrigin(
      "https://mcp-app-abcd.web-sandbox.oaiusercontent.com/?app=research",
    ),
    "https://mcp-app-abcd.web-sandbox.oaiusercontent.com/*",
  );
  for (const url of [
    "https://example.org",
    "http://mcp-app-abcd.web-sandbox.oaiusercontent.com",
    "https://mcp-app-abcd.web-sandbox.oaiusercontent.com.evil.example",
    "https://user:secret@mcp-app-abcd.web-sandbox.oaiusercontent.com",
    "https://mcp-app-abcd.web-sandbox.oaiusercontent.com:8443",
  ])
    assert.throws(() => researchOrigin(url), { code: "research-unrecognized" });
});
