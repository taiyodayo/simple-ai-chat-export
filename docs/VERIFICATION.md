# Prototype verification

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
