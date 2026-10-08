# Retrieval implementation

The extension reads the current ChatGPT page in an isolated script after a toolbar click. It supports the observed guest message attributes and the signed-in message attributes, without private API requests or authentication-token access. `activeTab` plus `scripting` grants temporary access to the clicked tab.

It scrolls to the start and end, waits for stable message snapshots, and requires every previously observed message to remain present in order. Virtualised content that disappears, changing replies, navigation, loading indicators, missing IDs, and unknown message shapes stop export. The original scroll position is restored. The transcript is read twice before saving to catch changes, without requiring a second user action. Omissions are marked in the output; export downloads directly with `saveAs: false`.

This establishes a stable rendered transcript, not a server-side history proof. Export metadata identifies the rendered scope and does not assert full-history completeness. Citation labels are preserved; only source URLs actually present in message content are included. Attachments are marked as omissions. Long or virtualised layouts that cannot retain a stable transcript fail explicitly. Signed-in live verification remains required before release.

Guest DOM evidence: the owner supplied six messages at `/uc/<UUID>`. Messages use `data-message-role`, user text uses `data-user-message-copy`, assistant content uses `data-assistant-markdown`, and completed answers have `data-message-complete`. Ads may be inside the message container but outside its content; only message content is converted. Boot-time JSON may contain no rows even when the page contains messages, so it is not used as a history source.

## Current history renderer — 8 October 2026

Live inspection of the owner-provided history chat established a third message layout: `data-chatgpt-search-message-ids` identifies visible message units, `data-user-message-bubble` contains user text, and `data-chatgpt-selection-message-id` identifies the displayed assistant answer. Search units may reference several internal message IDs; the exporter uses the selected answer ID and its `data-markdown-text-style` content, not every referenced internal record. Conversation identity and complete turn state are checked.

The scrolling container uses `column-reverse` and negative scroll offsets. Both ends are now checked with that geometry, and the original position is restored. Code blocks use `data-markdown-copy="code-block"` with a CODE element rather than PRE; controls marked `exclude` are removed. Tests use hand-written synthetic markup only. Live inspection recognised eight messages without retaining or logging their text.
