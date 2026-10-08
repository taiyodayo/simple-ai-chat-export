# Independent adversarial review — 8 October 2026

Historical review of 0.2.0/0.2.1. Findings, counts and upload instructions below describe that snapshot. Current changes are recorded in [VERIFICATION.md](VERIFICATION.md); use [STORE_RESUBMISSION.md](STORE_RESUBMISSION.md) for the latest owner-operated upload.

Three agents independently reviewed baseline 0.2.0 (commit 43044c3): security, privacy and screenshot-based UX. A fourth agent implemented the permission-rejection fix. This is an internal source review with targeted synthetic experiments, not an external audit, certification or proof against every possible attack. No real chats or private account data were used.

## Verified issues and changes in 0.2.1

| Finding                                                            | Evidence                                                                                                          | Resolution                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent custom-folder saves overwrite the same candidate name   | Two real same-origin directory handles returned success for one filename; only the second content survived        | Origin-wide Web Lock covers candidate checks through close/abort. Cross-window tests preserve both files; queued cancellation/timeouts access no folder. External writers remain outside this lock. |
| Cancellation can leave extraction waiting forever                  | Unresolved Chrome injection and a MAIN report page replacing setTimeout                                           | Abort/deadline races release the caller and discard late results. Each injection/permission check has a 30-second deadline. Injected JavaScript itself cannot be forcibly terminated.               |
| Many separate backtick runs exhaust argument limits                | 260 KB code payload failed below the content-size budget                                                          | Iterative fence sizing; early text/tree/depth/table budgets; indexed retention checks. Large backtick, deep nesting and ragged-table regressions pass.                                              |
| downloads is a broad browser capability and was rejected by Google | Synthetic modified code sent a POST through downloads despite connect-src none; Google Purple Potassium rejection | Permission/API removed. Native saves use local Blob download links and report hand-off only; custom-folder completion still awaits close.                                                           |
| Privacy copy overstates retention/control                          | Files, memory, browser grants/history, sync and optional support exist                                            | Claims now distinguish local transient processing, requested persistent files, publisher collection, viewer/sync behavior and future-update trust.                                                  |
| Markdown can activate content in a downstream viewer               | Literal HTML remained in exported Markdown without executing in the extension                                     | Help explains remote images/HTML and recommends TXT or disabling those viewer features. Lossless Markdown is not advertised as safe executable HTML.                                                |

Tests: 60 unit tests and all 50 browser cases passed, including real extracted-extension TXT/Markdown downloads without chrome.downloads, all three provider readers, nested Deep Research, origin checks, cancellation, filename validation, cross-window folder saves, adversarial input, narrow layout and keyboard interaction. These use synthetic provider data; test-only host grants replace manual Chrome toolbar/permission actions. macOS Chrome is the verified target; no claim of independent Windows/Linux verification.

## Privacy conclusion

No shipped conversation-upload path or retained conversation cache was found. The extension necessarily reads plaintext, holds temporary data in memory and writes user-requested files. Chrome retains ordinary download records and granted report-origin permissions; chosen folders may be backed up or synced by other software. Optional support messages are received by the owner through the disclosed providers.

It is **not technically impossible for a malicious publisher or future update to steal data**. Independent probes demonstrated data-bearing tab navigation without a tabs permission and localStorage persistence without a storage permission. Removing downloads closes its broad API capability, but activeTab/scripting, directory read/write grants, navigation and publisher-controlled updates remain trust boundaries. Restrictive CSP, source publication and store review help review current behavior; they cannot enforce an honest publisher forever. Users can pin a reviewed local build to avoid automatic extension updates, while still trusting their browser, provider and OS.

## Attack surfaces inspected

Exact provider origins/routes and sandbox origins; wrong-tab/branch changes; schema cycles/duplicates/prototype keys; text-only UI and CSP; MAIN-world getters/globals; citation ranges/source URL schemes; filename traversal and reserved names; download/Blob lifetime; folder capability/creation/cancellation races; oversized/deep input; packaging/development dependencies; publisher updates; external links/viewers; static hosting and development preview boundaries.

No privileged popup XSS, arbitrary-path write, authentication-state reader or current chat-upload implementation was established. No backend or runtime dependency was added. Other extensions, compromised browser/OS/provider, native folder writers, external Markdown renderers and authentic full server-side history are outside the guarantees. Development preview Host/symlink hardening is an additional dev-tool recommendation; it is not shipped in the extension.

## UX walkthrough

The independent audit captured and inspected 29 initial screenshots plus seven follow-up views, including original and prospective outcome states. Export success in those screenshots was simulated; real download and directory behavior were checked separately by browser tests. Screenshots do not establish screen-reader compliance or donation conversion.

| Step                   | Health / finding                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| 1. Discover product    | A prominent Install action now precedes coffee in navigation.                                             |
| 2. Install             | Install jumps to expanded installation instructions.                                                      |
| 3. Open supported chat | Clear wrong-page/sign-in recovery.                                                                        |
| 4. Choose format       | Keyboard radios work; misleading formatting-intact copy tightened.                                        |
| 5. Choose folder       | Selection/reset and narrow reflow work; default path is illustrative because Chrome settings can differ.  |
| 6. Export/wait/cancel  | Clear progress/retry; retrieval waits now cancel promptly. A smaller 420x600 window needs scrolling.      |
| 7. Recover from errors | Specific guidance; rendered-only and unconfirmed-save copy tightened.                                     |
| 8. Allow Deep Research | Purpose explained; native permission flow still needs live/manual checking.                               |
| 9. Find output         | Native hand-off now directs users to Chrome Downloads. Showing a filename/destination would further help. |
| 10. Optional coffee    | Welcoming and explicitly optional after export; no payment or forced prompt.                              |
| 11. Help               | Comprehensive; a short topic index would improve scanning.                                                |
| 12. Privacy            | Detailed caveats belong here; trim repeated landing-page prose rather than adding more prompts.           |

The visible installation action is implemented; showing the actual filename/destination is a remaining improvement. Preserve the existing restrained design and voluntary post-export coffee placement. Do not add settings, nags, tracking or promises that all users will donate.

## Store operation

The owner operates the dashboard. Upload 0.2.1 to the existing item and follow [STORE_RESUBMISSION.md](STORE_RESUBMISSION.md). The three local-processing data categories remain appropriate; no downloads justification should remain after the replacement upload. There is no approved store install link yet.

Full independent findings, reproductions and 36 screenshots are archived in [ADVERSARIAL_REVIEWS_2026-10-08.md](ADVERSARIAL_REVIEWS_2026-10-08.md).
