# Security

## Scope

Version 0.2.2 uses deliberate, tested security controls. The source is public for inspection under [MIT + Commons Clause v1.0](LICENSE). This internal review does not establish maximum safety, absence of all vulnerabilities or honesty of future updates. See the [historical local assessment](security_local_audit.md) and [dated verification evidence](docs/VERIFICATION.md). Chrome Web Store publication is handled separately by the owner.

## Controls and limits

Treat conversation text, links, filenames and page properties as untrusted. The shipped extension uses exact supported origins/routes, bounded schema and content checks, an internal parent chain, rereads before saving, explicit omissions, text-only UI updates, restricted filenames and a restrictive extension-page CSP. There are no runtime dependencies or remote executable code. Rendered stability is not authenticated proof of complete server-side history.

Required permissions are only `activeTab` and `scripting`; no downloads permission, required host access or automatic content scripts are requested. The toolbar opens a local export window, and reading begins when the user chooses Export. `activeTab` grants origin access, not a browser-enforced one-conversation boundary.

Deep Research access is optional and requested for the detected report's exact HTTPS sandbox origin. Chrome retains that grant until revoked, and it covers more than one report. The implementation reads matching frames in the selected tab. Its `MAIN` script shares the report page's untrusted globals and component fields; the extension-page CSP does not protect that execution world. Unknown report/citation structures fail explicitly; source pages are not fetched.

Wrapped extraction/permission checks have cancellation and a 30-second deadline per operation. Late results are discarded. This does not terminate injected JavaScript, preempt synchronous work or impose a deadline on every browser prompt/API. Tree, depth, table and text budgets reject specified oversized inputs; they are not universal CPU or memory bounds.

Downloads receive a local Blob and report **Download started**, without confirming completion or supporting cancellation after handoff. Selected-folder writes report **Export saved** only after stream close. The directory picker grants read/write access broader than the shipped writer's candidate-name checks and requested file write. An origin-wide Web Lock serializes this extension's allocation/write/abort operations, including late-opening streams. Other applications, origins and profiles do not share that lock; file lookup and creation are separate operations. Failures may leave an empty placeholder, and a committed file cannot be undone by late cancellation.

Plain text is the default. Markdown remains untrusted content whose HTML/remote-image behavior depends on the external viewer. Literal code fences preserve displayed table-cell values; inline styling inside those cells is not retained. Saved files are unencrypted. Privacy, retention, optional support and hosting details are maintained in [PRIVACY.md](PRIVACY.md).

## Publisher and platform trust

The reviewed source has no conversation-upload path or retained conversation cache. Synthetic probes nevertheless demonstrated storage and data-bearing tab navigation under the unchanged 0.2.1 permissions/CSP. Those permissions and CSP remain unchanged in 0.2.2. A malicious publisher or future update is not technically prevented from retaining or transmitting data. Source visibility, store review and checksums cannot enforce future honesty. A pinned reviewed local build avoids automatic publisher updates but still trusts Chrome, the provider and OS.

Other extensions, compromised accounts/browsers/operating systems, external file readers and Markdown viewers remain outside the guarantees. Memory disposal is not secure erasure. Tests of synthetic conversations do not establish live compatibility or all-platform behavior.

## Verification and reporting

Pull requests to main require an up-to-date GitHub Actions `verify` check, including administrators. Native CodeQL, secret scanning/push protection and Dependabot are enabled. Packaging refuses dirty/mismatched source, reads a fixed inventory from Git and uses Python's standard ZIP writer. New releases use immutable publication and native release-attestation verification; older releases remain historical. The loopback development preview serves only approved cached assets and validates Host/method. These controls reduce specific risks; they are not security certification.

See [release checks](docs/RELEASE.md) and the [complete internal adversarial review](docs/ADVERSARIAL_REVIEWS_2026-10-08.md). Do not commit real conversations, credentials, profiles, captures or traces. Browser tracing is disabled; signed-in testing uses an external dedicated profile.

Report security issues through [private vulnerability reporting](https://github.com/taiyodayo/simple-ai-chat-export/security/advisories/new). Include version, browser, OS and a synthetic reproduction. Never send authentication tokens, private transcripts or session captures. Public issues are for ordinary bugs.
