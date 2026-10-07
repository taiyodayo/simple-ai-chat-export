export const conversationId = "11111111-1111-4111-8111-111111111111";
export function fixture({ count = 2, omission = false } = {}) {
  const nodes = [{ id: "root", kind: "root", parent: null }];
  for (let i = 1; i <= count; i++) {
    nodes.push({
      id: `message-${i}`,
      parent: i === 1 ? "root" : `message-${i - 1}`,
      role: i % 2 ? "user" : "assistant",
      parts: [
        {
          type: "text",
          text:
            i === 1
              ? "Keep this for later: 日本語 ☕\n\nA little room to think."
              : 'Certainly.\n\n```js\nconst tea = "earl grey";\n  console.log(tea);\n```\n\n| Item | Count |\n| --- | --- |\n| Cups | 2 |',
        },
      ],
      sources:
        i === count
          ? [{ title: "Example source", url: "https://example.com/reference" }]
          : [],
    });
  }
  if (omission) nodes.at(-1).parts.push({ type: "omission", kind: "image" });
  // A sibling branch must never enter the export.
  nodes.push({
    id: "alternative",
    parent: "message-1",
    role: "assistant",
    parts: [{ type: "text", text: "DO NOT EXPORT THIS ALTERNATIVE" }],
  });
  return {
    id: conversationId,
    title: "A small conversation ☕",
    selectedNode: `message-${count}`,
    rootNode: "root",
    complete: true,
    pendingPages: 0,
    stable: true,
    generating: false,
    nodes,
  };
}
export const identity = (data) => ({
  id: data.id,
  selectedNode: data.selectedNode,
});
