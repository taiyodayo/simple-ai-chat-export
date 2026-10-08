# Chrome Web Store submission — 0.2.0

The owner authorised production release and store publication. The app is a production release; Google review and store availability are separate statuses. Google accepted the upload and created item `hnolfghceldfcghkcfnfafainiiodkhl`. Its status is **Pending review**, submitted on 8 October 2026 at 06:10 UTC with automatic publication after approval selected. No approved store install URL is live yet.

## Listing fields

| Field                | Value                                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Name                 | Simple AI-Chat export for ChatGPT, Claude, Gemini                                                                    |
| Version              | 0.2.0                                                                                                                |
| Short description    | Save the displayed ChatGPT, Claude or Gemini conversation as plain text or Markdown. Local processing. No analytics. |
| Detailed description | Paste [store/description.txt](../store/description.txt).                                                             |
| Language             | English (United Kingdom), if that locale is offered; otherwise English.                                              |
| Category             | Productivity; choose the tools subcategory if required.                                                              |
| Price                | Free. The coffee link is optional and unlocks nothing.                                                               |
| Visibility           | Public.                                                                                                              |
| Distribution         | All supported regions unless the publisher's verified legal/account settings require otherwise.                      |
| Mature content       | No; the app itself supplies no mature content.                                                                       |
| Homepage             | https://ongaku.co.uk/simple-ai-chat-export                                                                           |
| Support              | https://ongaku.co.uk/simple-ai-chat-export#help                                                                      |
| Privacy policy       | https://ongaku.co.uk/simple-ai-chat-export/privacy                                                                   |
| Source               | https://github.com/taiyodayo/simple-ai-chat-export                                                                   |
| Licence              | MIT + Commons Clause v1.0; copyright (c) 2026 @taiyodayo.                                                            |

The name and short description come from manifest.json. Use no fabricated ratings, testimonials, compatibility, audit claims or store install URLs.

## Single purpose

Save the currently displayed conversation from ChatGPT, Claude or Gemini to a local Markdown or plain-text file, with a metadata header. The user initiates each export and chooses its format and destination.

## Permission justifications — paste into the Privacy tab

**activeTab**

Temporary access to the tab where the user clicks the extension. The exporter validates the exact supported conversation URL and reads displayed messages only after the user chooses Export. It does not inspect other conversations or run automatic background collection.

**scripting**

Inject the packaged DOM reader into the selected tab to read the displayed conversation and check its stability. The script briefly scrolls and restores the page position. A second read detects changes before saving. Scripts are included in the ZIP; no code is downloaded.

**downloads**

Create the user's requested local export in Chrome's download destination and confirm whether that specific download completed, was cancelled or was interrupted. The extension queries only downloads it starts; it does not enumerate the user's download history. Custom-folder writes use a user-selected File System Access directory handle instead.

**Optional host permission: https://_.web-sandbox.oaiusercontent.com/_**

ChatGPT Deep Research reports are displayed in cross-origin sandbox frames which ordinary activeTab access cannot read. The wildcard declares potential sandbox access, but the user-triggered permission request is limited to the detected exact HTTPS mcp-app sandbox origin. The exporter reads matching report text/citation data in the chosen tab only; it does not fetch cited sources, inspect research activity or read authentication state. Users can revoke the persistent site grant in Chrome's extension settings. No additional required host access is requested for ordinary conversations.

## Remote code

Select **No, I am not using remote code**.

All executable JavaScript is packaged locally. Reading text/citation fields already loaded by the chat app is data handling, not downloading executable code. No eval, remote scripts, runtime libraries or remote configuration are used.

## User data declarations

Disclose local processing: do not select “no user data” solely because the extension has no backend. The app reads chat text and records its title/URL in a local export.

Select **Website content**, **Personal communications**, and **Web history** (limited here to the selected chat's URL/title, not general browser history). Explain where a comment field is available:

> The user-selected chat text, title, URL, source links and message identifiers are processed locally to create the requested export. No conversation information is uploaded, retained in extension storage, sold, used for ads or profiling, or sent to the developer. The extension does not request the history, cookies or identity APIs. Files and download records remain under the user's control.

Other data categories are not independently extracted: the extension does not read payment fields, account credentials, health records, location, click tracking or identity profiles. Conversation text can contain sensitive information supplied by the user; the privacy policy covers that text and the unencrypted output file. Review the dashboard's exact category wording when completing the form.

Certify the three Limited Use declarations: data is not sold/transferred to third parties, is used only for the single purpose, and is not used to assess creditworthiness or for lending. The public website and optional support/coffee links have their own ordinary connection processing; clicking them sends no conversation data or referrer from the extension.

## Reviewer test instructions

Google’s Additional instructions field currently allows 500 characters. Paste [store/reviewer-instructions.txt](../store/reviewer-instructions.txt) (490 characters); leave username and password blank. The full scenarios below are linked from that text.

### Full test scenarios

1. Use desktop Chrome. No extension account, subscription, payment or developer credential is required.
2. For a test without signing in, open https://chatgpt.com, send a harmless prompt and wait for its completed guest conversation URL at /uc/<UUID>. Guest availability is controlled by ChatGPT; if unavailable, use your own ChatGPT account and a saved /c/<UUID> chat.
3. For Claude or Gemini, sign in using your own test account, create a harmless saved conversation and wait for a completed reply. Supported routes are claude.ai/chat/<UUID>, gemini.google.com/app/<hex-id>, and the account-prefixed Gemini /u/<number>/app/<hex-id> route.
4. Suggested prompt: “Give me a short explanation, a two-row Markdown table and a JavaScript code block that prints hello.” Synthetic content only.
5. Click the extension on that conversation. Choose Markdown, leave Save location at Downloads and select Export conversation. Confirm the .md file begins with metadata, uses the correct provider speaker label and contains the displayed text. Repeat with Plain text.
6. Choose Change above Export, select a writable directory and export. Confirm the file exists in that directory. Repeated exports keep both files with numbered names. Use Downloads resets the destination. Cancelling the folder dialog retains the previous destination.
7. Try while a reply is still generating, or switch chats during reading. The app must show a clear error and must not claim a completed save. The source includes synthetic automated cases for these conditions.
8. Optional Deep Research: use a completed supported ChatGPT report in a saved conversation. After detection, choose Allow Deep Research and export, then grant the exact sandbox-site request. The report text and citation URLs should be included. This scenario may require a ChatGPT subscription; ordinary export does not.
9. No developer login credentials are supplied or needed. No donation is required; the coffee link appears only after a successful save.

## Upload files

- ZIP: `dist/simple-ai-chat-export-0.2.0.zip` (manifest at ZIP root, full LICENSE included).
- Store icon: `store/assets/icon-128.png` (128 × 128 PNG, transparent outer padding).
- Screenshots: `store/assets/01-export.png` and `02-saved.png` (1280 × 800 PNG).
- Required small promotional tile: `store/assets/promo-440x280.png`.

Screenshots show the real extension UI. The success capture follows a real Chrome-script read/revalidation/download of hand-written synthetic chat markup; it is not an injected success message or a capture of a private chat. Promotional art uses the app's own export icon, not provider trademarks. Image generation/capture tooling is development-only and not shipped.

## Account and publishing steps

Use the dedicated app-publishing Google account, never the employer or Cloudflare account. The registered account is a personal hobby publisher; the owner selected Non-trader. The owner set the public publisher display name to @taiyo32; source copyright and author credit remain @taiyodayo. Google nevertheless requires a verified public contact email; do not use the owner's private login email for that field. Registration/payment, contact verification, two-step verification and any required declarations must be completed truthfully in Google's dashboard. Do not put login emails, private destinations, credentials or payment information in Git. The verified Google contact is `chat-simple-export@ongaku.co.uk`. Google contact verification confirmed inbound delivery through the domain’s existing catch-all. That catch-all is preserved. The separately verified Cloudflare destination now has an enabled exact alias route to the privately authorised publishing mailbox. Existing rules, catch-all and DNS were preserved. Support also uses the public help page and GitHub issues.

Upload the ZIP through **Add new item**, enter the fields above, add images, fill Privacy and Test instructions, select public/free distribution, and submit for review. The owner authorised publication; automatic publication after approval is the intended setting. Record the actual store item ID and review status in docs/RELEASE.md, then add the approved listing URL to the website and README once available. Google approval is not implied by merging this release.

## Primary references checked 8 October 2026

[Publishing](https://developer.chrome.com/docs/webstore/publish), [listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [local data handling](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [image specifications](https://developer.chrome.com/docs/webstore/images), and [Commons Clause](https://commonsclause.com/).
