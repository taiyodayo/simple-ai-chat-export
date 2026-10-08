# Verification

## ChatGPT prerelease — 8 October 2026

The owner authorised merging the current ChatGPT implementation and cutting the private `v0.1.1-beta.1` prerelease before broader provider support. Final verification passes 58 Node tests, 35 browser tests, source/manifest checks and formatting. The package name follows the project name/version and the inventory records its artifact filename and source commit. The manifest uses Chrome’s numeric version `0.1.1` with `version_name` set to `0.1.1-beta.1`. This is a private test release; Chrome Web Store publication, public repository access and unresolved licence/release gates are unchanged.

## Save location control — 8 October 2026

Added a folder control directly above Export with the standard Downloads path, a native Change action, and a Use Downloads reset. The compact green-and-white design was visually inspected using synthetic preview content. Export remains fully visible in a 440 × 700 content viewport; long folder names and keyboard operation were checked at 320 pixels wide. The extension window is 440 × 760 to accommodate the new control.

58 Node tests and 35 browser tests pass, along with source, manifest and formatting checks. Added coverage for native FileSystemDirectoryHandle writes in an isolated browser test filesystem, Unicode output, repeated exports, existing-file preservation, write/close failures, timeouts, late-stream cancellation, path traversal, picker cancellation and session-local destination selection. The installed extension’s actual macOS folder picker and Chrome write-access prompt were exercised with an empty temporary folder; selecting, cancelling and resetting were verified without exporting a real conversation. No extra manifest permission or persistent handle storage was added. Custom-folder absolute paths are unavailable through the browser API; filename existence checks and creation are not atomic across other applications.

## Deep Research support — 8 October 2026

The owner-provided completed report was successfully read and revalidated in the first Chrome profile. Both Markdown and TXT were generated in memory, including the full report text and six numbered source URLs. Only structural information and counts were inspected; the report body was not logged, retained as a fixture or downloaded during this verification.

The new tests cover original report formatting, deduplicated numbered sources, zero-length source footers, image omissions, unsupported references, invalid/overlapping ranges, unsafe links, permission denial/retry, unfinished or changing reports, nested sandbox frames, conversation ordering, grouped-message identifiers, actual downloads of both formats and changed-report revalidation. Required permissions remain unchanged; Deep Research adds optional access to the detected report app origin. Its report component and reference schema are private implementation details and may change. Multiple reports with identical iframe URLs are rejected because their correspondence cannot be established unambiguously.

## Chrome testing setup — 8 October 2026

Loaded the source `extension` directory through Chrome’s Load unpacked picker in the existing first profile (`Default`). Chrome 154.0.8037.98 on macOS reports Simple ChatGPT Export 0.1.0 enabled, and its saved extension configuration points to this checkout. ChatGPT is open in that profile for manual testing. No conversation was exported during this setup.

All 41 Node tests, 26 browser tests, source checks and formatting checks pass. The browser tests include loading the extracted package and downloading both formats. README and live-testing instructions now match automatic downloads and recorded text-only omissions. These checks do not establish live long-history completeness or verify native save dialogues.

## Session close — 8 October 2026

Final checks: 41 Node tests, 26 browser tests, and the syntax/manifest/common-secret checks pass. The owner successfully exported the history conversation and supplied the output for spacing review. Nested HTML separators are now merged without altering fenced-code whitespace. Export starts with one click, skips the extra omission confirmation, and downloads without a forced Save As dialog. The success screen includes the updated coffee message.

The source remains private and is not approved for store submission. Rendered-message extraction cannot guarantee unloaded history. Security review, licence, public support contact, and cross-browser/platform release checks remain outstanding. The entries below preserve earlier verification evidence and its limitations.

## Page extraction — 8 October 2026

37 Node tests and 20 Playwright tests pass. New browser cases exercise guest and signed-in DOM layouts, code whitespace, tables, safe source links, exclusion of ads, changing replies and rejection of disappearing virtualised messages. An integration test uses Chrome scripting to extract and revalidate the page, then saves both formats through the actual downloads API and compares the files byte for byte.

The scripting integration harness adds a ChatGPT host permission to a temporary copy of the extension to replace a physical toolbar click's activeTab grant. The distributed manifest has no host permission. The separate packaged-extension test continues to load the unmodified installation ZIP. Native save dialogs are bypassed only by the test harness.

A fresh live guest conversation was created in dedicated Chromium. The production page reader extracted both messages, including Japanese text and emoji. Live signed-in retrieval, long-history completeness, native save dialogs and other operating systems remain unverified. Export metadata and UI disclose that this reads rendered messages, not a verified server-side history. No store submission or external security audit has occurred.

A further full-flow live test in a fresh browser profile timed out waiting for a completed ChatGPT response. It did not verify a live download. The successful live evidence is page extraction in the dedicated profile; full extraction-to-download evidence uses controlled HTML fixtures through Chrome scripting.

## Live history layout fix

With the owner enabling Apple Events inspection, the current history renderer was inspected structurally. The updated production reader recognised four user messages and four assistant answers. The actual extension UI then completed retrieval and reached its eight-message text-only confirmation. No conversation text was logged or committed. Native save completion for this conversation remains unconfirmed. Ten targeted extraction browser tests pass, including the new renderer, displayed-answer identity, reverse scrolling, and code-block toolbar exclusion.

## Earlier prototype checks

Tested 7 October 2026 on the local macOS environment with Node 26.9.0, Playwright 1.63.0 and bundled Chromium 153.0.8010.12.

- 36 Node tests pass: internal branch completeness and ordering, alternative branches, Unicode/code/tables/sources, omitted content, wrong origin, invalid graph/response states, single-file metadata preservation, safe filenames, download completion/cancellation races, preview startup/port collisions and the narrow support-page worker handler.
- 15 Playwright tests pass: first use, both format controls, omission consent, success/coffee, retry, cancellation, changing branches, offline/sign-out states, 2,000-message counts, keyboard/narrow-screen use, untrusted HTML, support-page honesty and an extracted-extension download.
- The extracted 14-file extension installation ZIP loads in a fresh Chromium profile. Synthetic TXT and Markdown exports complete through the actual downloads API; the downloaded text matches the expected metadata header and transcript. Conversation exports are not ZIP files. Native OS save dialogues are bypassed in this test and still require manual verification.
- Synthetic success and support-page screenshots were visually inspected outside Git. The compact success state fits a 420 × 600 viewport. No real chat screenshots were captured.
- `pnpm check` passes JavaScript syntax, manifest-access, prohibited runtime-pattern and common secret-pattern checks. The owner's private Gmail does not occur in the staged source. This is not an external audit or an exhaustive secret detector.

Not verified: live ChatGPT retrieval, private endpoint stability, pagination adapter, selected UI branch identity, signed-in traffic, native save dialogue, Windows/Linux/other Chromium browser behaviour, email forwarding, store submission or payment-provider behaviour. The source is private and has no settled redistribution licence. Public release remains blocked.

Package hashes and the actual source commit are generated in `dist/inventory.json` at packaging time. The package contains no test fixture, dev dependency, profile, capture or website file. Re-run packaging from the clean reviewed source before distribution.

## Website deployment — 8 October 2026

The support page and dedicated privacy policy are live on the owner’s verified personal Cloudflare account. Both return HTTP 200 with the expected CSP, referrer and no-transform headers. Live Chromium checks found zero scripts, zero third-party requests and no private email addresses in the page content. The root homepage retained its original SHA-256 and `/seatdesigner` still returned its original application. The Worker account is pinned in configuration; no DNS or mail records were changed.
