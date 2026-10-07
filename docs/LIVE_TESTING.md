# Live-test handoff

The prototype is ready for owner review. Live retrieval is intentionally disabled until the evidence in [RETRIEVAL.md](RETRIEVAL.md) is collected.

## Owner setup

1. Run `pnpm inspect:live` from the project directory. It opens a separate browser with the prototype loaded.
2. Sign in to ChatGPT yourself. Do not paste credentials or tokens into chat or a terminal.
3. Create a synthetic conversation with Japanese text, emoji, paragraphs, a code block, a small table and a cited link. Add a harmless test attachment if available.
4. Edit an earlier prompt and regenerate an answer to create alternate branches. Keep a second saved conversation available for navigation tests.
5. Keep one sufficiently long synthetic conversation available to exercise loading/virtualisation. Existing private conversations should not become fixtures or screenshots.
6. Tell the implementer when the profile is ready. The next step is the observed retrieval investigation, not publishing.

Profile location: `~/.local/share/simple-chatgpt-export/live-browser-profile`, outside Git. Browser authentication persists there under the browser's normal behaviour. The launcher records no HAR, traces, screenshots, network bodies or tokens. A separate profile does not limit which chats exist in the signed-in account. If sign-in rejects an automated browser, stop and arrange a normal dedicated Chrome profile; do not bypass authentication checks.

## Evidence to record

Record browser/OS versions, request method and sanitised endpoint shape, paging/continuation behaviour, selected-branch identifiers' correspondence to the UI, root/leaf evidence, state stability and required permissions. Do not commit message bodies, real IDs, tokens or captures.

After implementing the observed adapter, compare the export against the known synthetic thread. Test switching branches during retrieval and during the text-only confirmation, navigating away, ongoing generation, network interruption, sign-out and unexpected response shapes. Uncertain completeness must block saving.

## Manual save and satisfaction check

On each claimed browser/platform: open the extension from the toolbar; export each format; cancel the native save dialogue; choose an unwritable destination; close the export window while pending; retry; open the resulting TXT or Markdown file; edit the transcript; inspect the metadata header and omission markers. Confirm that only a completed save shows the coffee link. Click it deliberately and verify the destination and absence of conversation-derived parameters/referrer. There is no need to make a payment.

No real-conversation test has been completed yet. Browser automation currently verifies synthetic UI states and actual Chromium download completion with the native dialogue bypassed, not the native dialogue itself.
