# Live-test handoff

The production extension reads rendered messages from ChatGPT (guest and signed-in), Claude and Gemini conversations and saves Markdown or plain text. The current method and its completeness limits are documented in [RETRIEVAL.md](RETRIEVAL.md). This guide covers the remaining manual checks; it does not imply approval for store release.

## Owner setup

1. For an existing Chrome profile, open that profile’s `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this repository’s `extension` directory. If already installed, click Reload on its card. Alternatively, run `pnpm inspect:live` to open a separate test browser with the extension loaded.
2. Start with a guest conversation; no sign-in is required. For the separate signed-in cases, sign in to each chat app yourself. Do not paste credentials or tokens into chat or a terminal.
3. Create a synthetic conversation with Japanese text, emoji, paragraphs, a code block, a small table and a cited link. Add a harmless test attachment if available.
4. Edit an earlier prompt and regenerate an answer to create alternate branches. Keep a second saved conversation available for navigation tests.
5. Keep one sufficiently long synthetic conversation available to exercise loading/virtualisation. Existing private conversations should not become fixtures or screenshots.
6. Open the extension from the toolbar on the conversation, export each format, and compare the downloaded files against the displayed branch. Keep the browser open for further inspection. Guest conversations may not survive closing the browser.

The dedicated profile keeps its original directory across the app rename. Profile location: `~/.local/share/simple-chatgpt-export/live-browser-profile`, outside Git. Browser authentication persists there under the browser's normal behaviour. The launcher records no HAR, traces, screenshots, network bodies or tokens. A separate profile does not limit which chats exist in the signed-in account. If sign-in rejects an automated browser, stop and arrange a normal dedicated Chrome profile; do not bypass authentication checks.

## Evidence to record

Record browser/OS versions, the recognised page layout, the expected and exported message counts, displayed-branch correspondence, loading/virtualisation behaviour and state stability. The exporter uses page extraction rather than a conversation API request. Check exporter-attributable traffic separately from ChatGPT’s ordinary traffic. Do not commit message bodies, real IDs, tokens or captures.

Compare both formats against the known synthetic thread. Test switching branches during retrieval, navigating away, ongoing generation, interrupted loading, sign-out and unexpected page layouts. Known non-text omissions are recorded automatically in the transcript and metadata; there is no separate text-only confirmation. Changed or uncertain page content must block saving. An export cannot prove that history never rendered by the page is complete.

## Manual save and satisfaction check

On each claimed browser/platform: open the extension from the toolbar; export each format; check Chrome’s Downloads; close the export window while pending; retry; open the resulting TXT or Markdown file; edit the transcript; inspect the metadata header and omission markers. The extension hands a local Blob to Chrome and follows its download settings; Download started does not confirm completion. If those settings show a native save dialogue, also test cancellation and an unwritable destination. Confirm that Download started shows the requested filename and a completion caveat; selected-folder Export saved requires writer close and shows the actual filename/destination. The optional coffee link follows either outcome. Click it deliberately and verify the destination and absence of conversation-derived parameters/referrer. There is no need to make a payment.

Also test **Save location → Change**: the native folder picker starts at Downloads, cancellation preserves the previous location, and **Use Downloads** resets it. Export both formats to a selected test folder, repeat an export with the same filename, deny folder access, and interrupt a pending write. Confirm success appears only after the stream closes. Selected-folder files should be checked in that folder, not Chrome’s download history. The choice is not retained after closing the export window. Default paths shown in the control are standard OS paths; Chrome settings may configure another Downloads destination. Chrome exposes only the name of a custom folder.

The owner has successfully exported a signed-in ChatGPT history conversation. Live Claude and Gemini extraction, revalidation and formatting have also passed in the first Chrome profile; see [VERIFICATION.md](VERIFICATION.md) for the recorded evidence. Browser automation verifies synthetic UI states and actual Chromium download completion. Long-history completeness, native dialogues and other operating systems still require manual checks.
