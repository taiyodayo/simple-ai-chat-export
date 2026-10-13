# Changelog

Version numbering moved to 1.x on 13 October 2026. Earlier tags and immutable GitHub releases keep their original numbers: v0.2.1 is 1.0.0 and v0.2.2 is 1.0.1. Release ZIPs and checksums are on [GitHub releases](https://github.com/taiyodayo/simple-ai-chat-export/releases).

## 1.0.3 — 13 October 2026

- Claude: exports work again on the current transcript layout, which keeps only the messages near the viewport mounted. Every export failed with "We couldn't verify the rendered conversation" because older messages left the page while scrolling. The reader now walks the transcript and merges the mounted windows.
- Claude: user messages use the page's turn key as their ID, like replies.

## 1.0.2 — 13 October 2026

- Gemini: Maps place chips and place cards are kept instead of dropped. Chips export inline as `name (Google Maps URL)`; cards export with their rating and opening hours.
- Gemini: Maps places are listed under each reply's Sources.
- Gemini: screen-reader-only text such as "Click to open side panel" is excluded.
- Website: links the Chrome Web Store listing and GitHub releases, and shows what changed in the latest version.
- Numbering: first release under 1.x.

## 1.0.1 — 8 October 2026 (released as 0.2.2)

- Plain text is the default format; save outcomes show the actual filename.
- Markdown table cells keep backslashes and pipes literally.
- Packaging uses Python's standard ZIP writer and refuses dirty or version-mismatched source.
- Approved and published on the Chrome Web Store on 12 October 2026.

## 1.0.0 — 8 October 2026 (released as 0.2.1)

- Removed the downloads permission and API after the 0.2.0 store rejection. Exports use local Blob download links or a user-selected folder.
- ChatGPT, Claude and Gemini share one export flow.
