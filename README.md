# Simple AI-Chat export for ChatGPT, Claude, Gemini

**Save a conversation with minimum effort, because OpenAI won't let you.**

Save the ChatGPT, Claude or Gemini conversation you’re viewing as plain text or Markdown, ready for archiving or a quick edit. Made by **@taiyodayo**. Not affiliated with OpenAI, Anthropic or Google.

**Production version: 0.2.2.** ChatGPT, Claude and Gemini share the same export flow. Chrome Web Store submission is handled by the owner; an approved install link has not been recorded here. Live saved-conversation reads were checked in Chrome on macOS; other platforms remain unverified. Export checks rendered stability, not server-side history completeness. The preview uses synthetic conversations.

Source is available for security inspection and local builds under **MIT + Commons Clause v1.0**, with credit to **@taiyodayo**. The earlier ChatGPT baseline remains archived as [v0.1.1-beta.1](https://github.com/taiyodayo/simple-ai-chat-export/releases/tag/v0.1.1-beta.1).

[![Buy me a coffee](docs/coffee.svg)](https://buymeacoffee.com/taiyodayo)

Support the project, entirely optionally.

## Build and install locally

Use a supported Node.js LTS release, pnpm and Python 3. Packaging uses Python’s standard ZIP writer and requires a clean Git checkout with committed source.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm preview
```

Open the **Preview** URL printed in your terminal (normally <http://127.0.0.1:4173>). If that port is already in use, the preview automatically chooses the next available port. Restart it after changing source files: it serves a fixed snapshot of approved assets. Press **Ctrl+C** when finished. Choose a scenario beneath the preview to try success, omissions, cancellation or failure. This preview **simulates saving**; it never accesses your chats. The support page is at `/simple-ai-chat-export` on the same preview address.

To inspect the actual extension, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select this repository’s `extension` directory. No build is needed. Open a saved ChatGPT, Claude or Gemini conversation, then choose **Simple AI-Chat export for ChatGPT, Claude, Gemini** from the browser’s Extensions menu. If already installed, click Reload on its extension card after updating these files.

## Intended everyday use

1. Open the conversation and branch you want to keep.
2. Open Simple AI-Chat export for ChatGPT, Claude, Gemini. Plain text is selected by default; choose Markdown if wanted. **Save location** defaults to Downloads; choose **Change** to pick another folder, then **Export conversation**.
3. Find your `.md` or `.txt` file in the selected folder. Metadata appears at the beginning, followed by the conversation.

The default control shows the standard OS Downloads path (`~/Downloads` on macOS/Linux or `%USERPROFILE%\\Downloads` on Windows); Chrome’s download settings determine the actual default location and whether a save dialogue appears. Selecting a folder opens a native directory picker initially at Downloads and grants access to that folder. Chrome exposes its name rather than its absolute path, so custom destinations display `…/folder-name`. The choice lasts for the current export window; **Use Downloads** resets it. Custom-folder exports write directly to that folder and do not appear in Chrome’s download history. Existing filenames receive a numbered suffix rather than being intentionally overwritten.

The transcript keeps speaker labels and displayed text, including paragraphs, Unicode, code and table values. Markdown table cells use literal code spans; inline styling within cells is not retained. Plain text retains readable Markdown-style notation where present rather than attempting lossy conversion. Metadata holds the title, conversation URL, provider, branch/message identifiers, export date, format, count and omissions. Provider session cookies and authentication state are not read; titles or messages can contain secrets that a user typed. No donation message is added to your files.

One editable file keeps the metadata and transcript together. Keep the export window open while reading or writing. **Download started** shows the requested filename; check Chrome Downloads for completion. **Export saved** shows the actual filename and selected folder only after stream close. Cancellation cannot undo a download already handed off or a file already committed. Both outcomes show the message count and an optional coffee link.

## Scope and limits

- One currently displayed conversation in ChatGPT, Claude or Gemini (plus ChatGPT guest chats), and its selected branch. No bulk export, alternate branches, PDF, cloud sync or account signup.
- Completed ChatGPT Deep Research reports in the observed embedded report layout are included, with their original Markdown and numbered citation URLs. Chrome asks for optional access to the report’s embedded site the first time it is needed. Unfinished reports and unknown report or citation layouts block export.
- Non-text files are not downloaded. Known omissions are recorded in the transcript and metadata; the success screen identifies a text-only copy. Unknown content or uncertain completeness blocks export.
- Saved chat routes: `chatgpt.com/c/<UUID>`, `claude.ai/chat/<UUID>`, and `gemini.google.com/app/<chat-id>` (including `/u/<account>/app/<chat-id>`). ChatGPT guest chats at `/uc/<UUID>` also work. Provider detection is automatic; no setup or provider selector. Shared links, temporary chats and other routes are not promised.
- Claude artifacts, Gemini Canvas and content outside the displayed messages are not archived. Gemini Deep Research needs separate verification; only the ChatGPT embedded report reader is supported.
- Earlier history that the app does not load cannot be proved complete. Claude/Gemini DOM-generated IDs use content hashes where stable message IDs are unavailable; metadata labels these as rendered exports.
- Desktop Chrome on macOS, Windows and Linux is the target. Edge, Brave and other Chromium browsers are candidates for verification, not yet certified. There is no mobile support claim.
- The exported file is not encrypted. Conversation text is untrusted; a Markdown editor’s handling of embedded links, images or HTML is outside the extension’s control.

## Permissions and privacy

`activeTab` and `scripting` allow user-triggered reading of the selected tab; the grant is broader than one conversation. Deep Research optionally requests the detected report's exact sandbox origin, retained until revoked in Chrome settings. There is no downloads permission, required host access, automatic collection or retained conversation cache.

Processing and file creation run locally. Saved files, browser records, optional support and future updates have separate trust boundaries. See [privacy](PRIVACY.md), [security](SECURITY.md) and the [retrieval decision gate](docs/RETRIEVAL.md).

## Verification and packaging

```sh
pnpm test
pnpm test:browser
pnpm check
pnpm package
```

The release package is built from an explicit file inventory. `dist/` contains the ZIP, SHA-256, inventory and source commit record. Chrome Web Store approval is a separate status. The ZIP includes the complete licence. Store submission fields and reviewer instructions are in [STORE_LISTING.md](docs/STORE_LISTING.md); publishing steps and remaining account tasks are in [RELEASE.md](docs/RELEASE.md).

When ready for the live investigation, run `pnpm inspect:live`. It opens a dedicated browser profile outside the repository. Sign in manually and use synthetic test conversations. It does not record network traffic, screenshots or tokens. Close the browser to end the session. See the [live-test guide](docs/LIVE_TESTING.md).

The source and Chrome Web Store release must correspond to the same tag. Store installations may update automatically; unpacked installations update only when their local source is replaced. A checksum proves artifact identity, not security.

## Contact and licence

[Website and help](https://ongaku.co.uk/simple-ai-chat-export) · [Privacy policy](https://ongaku.co.uk/simple-ai-chat-export/privacy). The production support and privacy pages are live; the legacy `/simple-chatgpt-exporter` URLs remain working aliases. Report bugs through [GitHub issues](https://github.com/taiyodayo/simple-ai-chat-export/issues) or email [chat-simple-export@ongaku.co.uk](mailto:chat-simple-export@ongaku.co.uk). Never send tokens, passwords or private transcripts.

Copyright © 2026 **@taiyodayo**. Licensed under [MIT + Commons Clause v1.0](LICENSE).

You may inspect, modify, build and install the software on your own machine. Redistribution must retain the copyright, MIT text and Commons Clause notice. The Commons Clause excludes selling a product or service whose value derives entirely or substantially from the software, including relevant hosting or consulting/support fees. It is a sales restriction, not a blanket ban on competing businesses.

The source is public mainly so users can inspect security and privacy behaviour. This is **source-available**, rather than OSI open-source or unrestricted MIT. The complete licence governs; this summary does not add conditions.
