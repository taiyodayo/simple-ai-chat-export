# Production release and Chrome Web Store publication

**Version: 0.2.0.** The owner authorised production status, public source for security inspection, MIT + Commons Clause v1.0 and Chrome Web Store publication. Store status: **draft uploaded and completed; submission blocked only by missing verified public contact email**. Item ID: `hnolfghceldfcghkcfnfafainiiodkhl`. Google review/publication is not yet completed; no approved store install URL is live.

## Release preparation

- [x] Shared ChatGPT, Claude and Gemini UI/readers implemented; live read/revalidation/formatting evidence recorded.
- [x] MIT + Commons Clause v1.0 selected; copyright and visible credit remain @taiyodayo. Full licence included in source and upload ZIP.
- [x] Production version and current UI, README, help/privacy and website wording updated.
- [x] Store description, permission/data declarations and reviewer test instructions prepared in [STORE_LISTING.md](STORE_LISTING.md).
- [x] Support uses the public website and GitHub issues. Security reports use private vulnerability reporting; no unverified email address is advertised.
- [x] Website/privacy and new/legacy URLs verified. Existing homepage and /seatdesigner preserved.
- [x] Final release tests, package/inventory checks and repository-history review completed and recorded in [VERIFICATION.md](VERIFICATION.md).
- [x] Merge [PR #3](https://github.com/taiyodayo/simple-ai-chat-export/pull/3), tag v0.2.0 and publish the clean-source ZIP/checksum/inventory in the [production release](https://github.com/taiyodayo/simple-ai-chat-export/releases/tag/v0.2.0).
- [x] Publish source and enable GitHub private vulnerability reporting.

## Google dashboard tasks

- [x] Dedicated app-publishing account registered/authenticated. The owner selected Non-trader for a personal hobby; public publisher name is @taiyodayo.
- [ ] Required public contact email supplied and verified. Google blocks submission until this is complete; the private login address must not be used.
- [x] ZIP, description, icon, screenshots and promotional tile uploaded; privacy, permission and test fields completed. Public/free distribution selected.
- [ ] Submitted for review with automatic publication after approval. Record item ID, submission time and review status here.
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
