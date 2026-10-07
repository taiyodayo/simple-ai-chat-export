# Simple ChatGPT Export

**Save this chatGPT conversation.**

Save the ChatGPT conversation you’re viewing as Markdown or plain text, ready for archiving or a quick edit. Made by **@taiyodayo**. Not affiliated with OpenAI.

**Private prototype — not ready for live exports or public installation.** The interface, formatting and save flow are implemented. ChatGPT retrieval is deliberately disabled until a live investigation can establish complete, selected-branch extraction. The browser preview uses synthetic conversations only.

[![Buy me a coffee](docs/coffee.svg)](https://buymeacoffee.com/taiyodayo)

Support the project, entirely optionally.

## Try the prototype

Use a current Node.js release and pnpm. Python 3 is used to verify the extension installation package.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm preview
```

Open the **Preview** URL printed in your terminal (normally <http://127.0.0.1:4173>). If that port is already in use, the preview automatically chooses the next available port. Press **Ctrl+C** when finished. Choose a scenario beneath the preview to try success, omissions, cancellation or failure. This preview **simulates saving**; it never accesses your chats. The support-page draft is at `/simple-chatgpt-exporter` on the same preview address.

To inspect the actual extension, open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select this repository’s `extension` directory. No build is needed. Open a saved ChatGPT conversation, then choose **Simple ChatGPT Export** from the browser’s Extensions menu. The prototype clearly explains that live export is not ready.

## Intended everyday use

1. Open the conversation and branch you want to keep.
2. Open Simple ChatGPT Export. Choose Markdown or plain text, then **Export conversation**.
3. Choose where to save your `.md` or `.txt` file. Metadata appears at the beginning, followed by the conversation.

The transcript keeps speaker labels and the original text, including paragraphs, Unicode, code and table syntax. Plain text retains readable Markdown-style notation where present rather than attempting lossy conversion. Metadata holds the title, conversation URL, branch/message identifiers, export date, format, count and omissions. It does not contain authentication data. No donation message is added to your files.

One editable file keeps the metadata and transcript together. No ZIP or companion file. Keep the export window open until saving finishes. A cancelled or interrupted save never displays success. The success screen shows the message count and an optional coffee link.

## Scope and limits

- One currently displayed, saved conversation and its selected branch. No bulk export, alternate branches, PDF, cloud sync or account signup.
- Non-text files are not downloaded. Known omissions require an explicit **Export text only** action and are recorded in the transcript and metadata. Unknown content or uncertain completeness blocks export.
- Current URL recognition is deliberately limited to `https://chatgpt.com/c/<conversation-id>`. Projects, custom GPT routes, shared links and temporary chats are unverified, not promised.
- Desktop Chrome on macOS, Windows and Linux is the target. Edge, Brave and other Chromium browsers are candidates for verification, not yet certified. There is no mobile support claim.
- The exported file is not encrypted. Conversation text is untrusted; a Markdown editor’s handling of embedded links, images or HTML is outside the extension’s control.

## Permissions and privacy

`activeTab` allows a tab-address check after you click the extension. It does not technically enforce a single-conversation boundary. `downloads` allows saving and checking the outcome of the download the extension starts; this browser permission is broader than the extension’s use of it. No host permissions, automatic content scripts, cookies access, telemetry, remote libraries or storage permission. `scripting` will only be added if the live investigation establishes a need.

The small service worker only opens the export window in response to your toolbar click. It does not poll or retrieve chats. Export data is held in the window’s memory and released after use; no secure-memory-erasure guarantee is made. Read [privacy](PRIVACY.md), [security and verification limits](SECURITY.md), and the [retrieval decision gate](docs/RETRIEVAL.md).

## Verification and packaging

```sh
pnpm test
pnpm test:browser
pnpm check
pnpm package:prototype
```

The prototype package is built from an explicit file inventory. `dist/` contains the ZIP, SHA-256, inventory and source commit record. Packaging does not imply release approval. Before release, test that extracted package, verify live retrieval and traffic, settle the licence, activate support, and complete the [release checklist](docs/RELEASE.md).

When ready for the live investigation, run `pnpm inspect:live`. It opens a dedicated browser profile outside the repository. Sign in manually and use synthetic test conversations. It does not record network traffic, screenshots or tokens. Close the browser to end the session. See the [live-test guide](docs/LIVE_TESTING.md).

The source and Chrome Web Store release must correspond to the same tag. Store installations may update automatically; unpacked installations update only when their local source is replaced. A checksum proves artifact identity, not security.

## Contact and licence

[Website and help](https://ongaku.co.uk/simple-chatgpt-exporter) · [Privacy policy](https://ongaku.co.uk/simple-chatgpt-exporter/privacy). The pre-release website is live. Planned receive-only address: `chat-simple-export@ongaku.co.uk` (not yet active). Never send tokens, passwords or private transcripts in an issue.

Copyright © 2026 @taiyodayo. Attribution requirements are awaiting owner confirmation; no open-source licence has been granted yet. Do not describe this private prototype as an audited or licensed open-source release.
