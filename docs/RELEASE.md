# Production release and Chrome Web Store publication

## Replacement release 0.2.1

Version 0.2.0 was rejected with Purple Potassium for requesting downloads. Version 0.2.1 removes that permission/API and uses normal local Blob downloads; the owner will upload and resubmit the existing item. Standard downloads are labelled Download started; only custom-folder writer close confirms Export saved. The local-processing data declarations remain Personal communications, Web history and Website content, with all three Limited Use certifications.

The update also serializes same-origin custom-folder saves, bounds extraction waits/cancellation and hardens adversarial rendered input. See SECURITY.md and the independent audit record. Store approval and an install URL are still pending. The earlier submission record below is historical.

**Version: 0.2.0.** The owner authorised production status, public source for security inspection, MIT + Commons Clause v1.0 and Chrome Web Store publication. Store status: **Pending review; automatic publication after approval selected**. Item ID: `hnolfghceldfcghkcfnfafainiiodkhl`. Google review/publication is not yet completed; no approved store install URL is live.

## Release preparation

- [x] Shared ChatGPT, Claude and Gemini UI/readers implemented; live read/revalidation/formatting evidence recorded.
- [x] MIT + Commons Clause v1.0 selected; copyright and visible credit remain @taiyodayo. Full licence included in source and upload ZIP.
- [x] Production version and current UI, README, help/privacy and website wording updated.
- [x] Store description, permission/data declarations and reviewer test instructions prepared in [STORE_LISTING.md](STORE_LISTING.md).
- [x] Support uses the public website, GitHub issues and `chat-simple-export@ongaku.co.uk`; Google contact verification confirmed inbound delivery. Security reports use private vulnerability reporting.
- [x] Website/privacy and new/legacy URLs verified. Existing homepage and /seatdesigner preserved.
- [x] Final release tests, package/inventory checks and repository-history review completed and recorded in [VERIFICATION.md](VERIFICATION.md).
- [x] Merge [PR #3](https://github.com/taiyodayo/simple-ai-chat-export/pull/3), tag v0.2.0 and publish the clean-source ZIP/checksum/inventory in the [production release](https://github.com/taiyodayo/simple-ai-chat-export/releases/tag/v0.2.0).
- [x] Publish source and enable GitHub private vulnerability reporting.

## Google dashboard tasks

- [x] Dedicated app-publishing account registered/authenticated. The owner selected Non-trader for a personal hobby; public publisher name is @taiyo32.
- [x] Google contact email `chat-simple-export@ongaku.co.uk` supplied and verified; submission is enabled. The private login address is not published.
- [x] Inbound contact delivery confirmed by Google email verification through the existing domain forwarding. Existing rules and catch-all preserved.
- [x] Cloudflare destination verified and dedicated exact alias route enabled to the authorised publishing mailbox. API read-back confirmed the destination; existing rules, catch-all and DNS were preserved.
- [x] ZIP, description, icon, screenshots and promotional tile uploaded; privacy, permission and test fields completed. Public/free distribution selected.
- [x] Submitted on **8 October 2026 at 06:10 UTC** (**15:10 JST**) with automatic publication after approval selected. Dashboard confirms **Pending review** for item `hnolfghceldfcghkcfnfafainiiodkhl`.
- [ ] Google approval confirmed; add the actual store installation URL to README and website.

These are status records, not an additional approval requirement. The owner has already authorised the release and submission. Google account access or review cannot be replaced by changing repository wording.

## Documented verification limits

Desktop Chrome on macOS is verified. Windows, Linux, other Chromium browsers and mobile are not independently verified or advertised as tested. Rendered history is checked for stability; full server-side history completeness is not claimed. Claude artifacts, Gemini Canvas and Gemini Deep Research are outside supported scope. No external security audit is claimed. See the dated verification record.

## Reproduce the upload package

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test
pnpm test:browser
pnpm check
pnpm format:check
pnpm package
pnpm store:assets
```

Package only the explicit extension file inventory and LICENSE. Do not include fixtures, profiles, traces, private captures, credentials, support destinations or store marketing assets in the extension ZIP. The store screenshots use synthetic data. The release tag, ZIP inventory and checksum identify the exact upload source; checksums do not establish security.

Packaging requires Python 3 and a clean Git checkout; it reads only the fixed inventory from the committed Git tree and refuses version mismatches. Commit changes before running `pnpm package` or the extracted-package browser tests. Development preview does not require packaging.

For future releases, use GitHub release immutability: create a draft at the tested commit, attach the final verified ZIP/checksum/inventory and store assets, then publish once. Test that exact ZIP before attaching it; do not rebuild after verification. Run `gh release verify TAG` and `gh release verify-asset TAG PATH_TO_ZIP` against the published release. GitHub’s release attestation binds the published tag/commit/assets; it does not certify the build as secure. Historical v0.2.0 and v0.2.1 releases remain unchanged and mutable.
