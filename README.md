# Simple AI-Chat export for ChatGPT, Claude, Gemini

**Save this conversation.**

Save the ChatGPT, Claude or Gemini conversation you’re viewing as Markdown or plain text, ready for archiving or a quick edit. Made by **@taiyodayo**. Not affiliated with OpenAI, Anthropic or Google.

**Production release: 0.2.1.** A replacement Chrome Web Store package is ready after the 0.2.0 permission rejection; an install link will be added after approval. ChatGPT, Claude and Gemini use the same UI and save flow. Live saved-conversation reads have been checked in Chrome on macOS; other operating systems have not been independently verified. Export reads rendered messages, checks stability and preserves displayed order. It cannot prove server-side history completeness; virtualised content that disappears during checking is rejected. The preview uses synthetic conversations.

Source is available for security inspection and local builds under **MIT + Commons Clause v1.0**, with credit to **@taiyodayo**. The earlier ChatGPT baseline remains archived as [v0.1.1-beta.1](https://github.com/taiyodayo/simple-ai-chat-export/releases/tag/v0.1.1-beta.1).

[![Buy me a coffee](docs/coffee.svg)](https://buymeacoffee.com/taiyodayo)

Support the project, entirely optionally.

## Build and install locally

Use a current Node.js release and pnpm. Python 3 is used to verify the extension installation package.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm preview
```

Open the **Preview** URL printed in your terminal (normally <http://127.0.0.1:4173>). If that port is already in use, the preview automatically chooses the next available port. Press **Ctrl+C** when finished. Choose a scenario beneath the preview to try success, omissions, cancellation or failure. This preview **simulates saving**; it never accesses your chats. The support page is at `/simple-ai-chat-export` on the same preview address.

To inspect the actual extension, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select this repository’s `extension` directory. No build is needed. Open a saved ChatGPT, Claude or Gemini conversation, then choose **Simple AI-Chat export for ChatGPT, Claude, Gemini** from the browser’s Extensions menu. If already installed, click Reload on its extension card after updating these files.

## Intended everyday use

1. Open the conversation and branch you want to keep.
2. Open Simple AI-Chat export for ChatGPT, Claude, Gemini. Choose Markdown or plain text. **Save location** defaults to Downloads; choose **Change** to pick another folder, then **Export conversation**.
3. Find your `.md` or `.txt` file in the selected folder. Metadata appears at the beginning, followed by the conversation.

The default control shows the standard OS Downloads path (`~/Downloads` on macOS/Linux or `%USERPROFILE%\\Downloads` on Windows); Chrome’s download settings determine the actual default location and whether a save dialogue appears. Selecting a folder opens a native directory picker initially at Downloads and grants access to that folder. Chrome exposes its name rather than its absolute path, so custom destinations display `…/folder-name`. The choice lasts for the current export window; **Use Downloads** resets it. Custom-folder exports write directly to that folder and do not appear in Chrome’s download history. Existing filenames receive a numbered suffix rather than being intentionally overwritten.

The transcript keeps speaker labels and the original text, including paragraphs, Unicode, code and table syntax. Plain text retains readable Markdown-style notation where present rather than attempting lossy conversion. Metadata holds the title, conversation URL, provider, branch/message identifiers, export date, format, count and omissions. Provider session cookies and authentication state are not read; titles or messages can contain secrets that a user typed. No donation message is added to your files.

One editable file keeps the metadata and transcript together. No ZIP or companion file. Keep the export window open until saving finishes. A cancelled or interrupted save never displays success. The success screen shows the message count and an optional coffee link.

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

`activeTab` and `scripting` allow reading the clicked tab after you choose Export. It does not technically enforce a single-conversation boundary. No `downloads` permission is requested. Standard saves use a local download link; Chrome manages completion and the extension does not inspect download history. Selected-folder saves confirm completion after the stream closes. No required host permissions, automatic content scripts, cookies access, telemetry, remote libraries or storage permission.

Deep Research uses optional host access declared for `https://*.web-sandbox.oaiusercontent.com/*`. After a report is detected, **Allow Deep Research and export** requests access only to its exact sandbox app origin. Access persists until you remove it in Chrome’s extension settings. The exporter reads only matching report frames in the chosen tab when you export. It reads report text and citation data already loaded by ChatGPT; it does not retrieve source pages or research activity.

The small service worker only opens the export window in response to your toolbar click. It does not poll or retrieve chats. Export data is held in the window’s memory and released after use; no secure-memory-erasure guarantee is made. Read [privacy](PRIVACY.md), [security and verification limits](SECURITY.md), and the [retrieval decision gate](docs/RETRIEVAL.md).

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
