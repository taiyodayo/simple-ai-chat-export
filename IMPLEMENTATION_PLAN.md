# ChatGPT Simple Secure Exporter

Status: implementation authorised by the owner. Private GitHub development authorised; public release requires live verification and security review. Build a synthetic-data prototype before the owner provides a dedicated live testing profile.

## Principle

Remove all bloat, then add lightness. Writing is cheap; reading isn't.

Export the current ChatGPT conversation completely, in the selected branch's order, to a local text file. Keep the implementation small enough to review comfortably. Every permission, dependency, feature, and abstraction must justify its reading and maintenance cost.

All export processing happens on the user's device. Never send conversation content to developer infrastructure, analytics, AI services, payment providers, or other third parties. Retrieving existing conversation data from ChatGPT is permitted; external processing of that data is not.

## Ownership and boundaries

- This is @taiyodayo's personal project. Never publish the owner's private email. Use a GitHub no-reply commit address. Planned public contact: `chat-simple-export@ongaku.co.uk` (activate and verify before publication).
- Never use employer accounts, organizations, infrastructure, branding, or credentials.
- Use repository-local Git identity; never change global Git configuration. Verify the intended author name before making commits.
- Verify the personal GitHub and Chrome Web Store publishing identities before publication. Do not infer authorization from whichever account happens to be logged in.
- Keep payment-provider setup, financial advice, payment credentials, and private account details out of the repository. A public support link is the only payment-related runtime configuration needed.
- Licence undecided: the owner requires attribution to @taiyodayo. Do not assume MIT or grant redistribution rights until the exact requirement is settled.
- Public documentation must distinguish this independent project from an official OpenAI product.

## V1 scope

- Export the currently open, saved ChatGPT conversation only.
- Offer UTF-8 TXT and Markdown.
- Preserve speaker labels, paragraphs, Unicode, code indentation, readable tables, and source links where available.
- Follow the branch the user is viewing, including edited prompts and regenerated replies. Do not combine alternative branches.
- Show the exported message count.
- Explicitly report unsupported content and incomplete retrieval. Never silently describe a partial transcript as complete.
- Provide a small success state after the download completes:

  > Export saved.
  > Buy me a coffee?

- The support link is optional and never blocks export. It opens only after a deliberate click.

Exclude PDF, image downloading, bulk export, search, conversation management, cloud synchronization, AI processing, subscriptions, account systems, settings dashboards, and persistent chat storage. Do not add raw JSON as another product format unless a demonstrated need warrants it; synthetic JSON fixtures remain useful for development.

## Phase 1: investigate retrieval before implementing the extension

Use Playwright as a development and integration-testing tool, not a production dependency. Use pnpm for Node tooling and a dedicated browser profile signed into manually.

1. Observe one long conversation as ChatGPT opens it and loads additional sections. Record the behavior, not private message content.
2. Inspect the relevant network responses and their pagination or chunk-loading behavior. Do not assume that a saved HTML file or the current DOM contains the whole conversation.
3. Determine how to identify the conversation and the branch currently selected in the UI. Do not assume a server-provided current-node field always matches the displayed branch.
4. Establish whether a one-shot request, plus any explicitly required pagination, can retrieve the complete selected branch.
5. Define what evidence establishes completeness: an unbroken selected parent chain, known beginning and ending, resolved pagination, no unexplained missing nodes, and a stable response state.
6. If structured retrieval is unavailable, evaluate incremental scroll-and-collect, retaining each chunk before virtualization removes it. Assess stable identifiers, overlap, deduplication, ordering, and loading delays.

Choose one extraction strategy from the evidence. Do not ship parallel strategies or a fallback framework speculatively. If completeness cannot be established, stop with an honest explanation.

Keep real conversations, browser profiles, session tokens, network captures, screenshots, and Playwright traces outside Git. Use synthetic fixtures for committed tests. Do not request that users paste authentication tokens.

Decision gate: document the chosen retrieval method, required permissions, branch selection, and completeness checks before writing production extraction code.

## Phase 2: build the smallest extension

- Manifest V3; plain JavaScript, HTML, and CSS.
- Zero runtime npm dependencies, remotely loaded libraries, or frameworks.
- Prefer directly loadable source with no compilation, bundler, or minification.
- Begin with `activeTab` and `scripting`. Add another permission only when necessary and document why. If download-completion detection requires `downloads`, compare that cost with a simpler supported local-save mechanism before deciding.
- No automatic content scripts, persistent request interception, background polling, or monitoring of browsing activity.
- Run extraction only after an explicit user action, scoped in code to the current conversation.
- Separate extraction, pure formatting, and the small UI where that makes review easier. Avoid file-count or line-count targets that encourage dense code.
- Keep the task alive only as long as needed. Handle popup closure and cancellation explicitly rather than introducing an always-running background service.

Suggested flow:

1. User opens the extension on a supported conversation.
2. User chooses TXT or Markdown and selects Export.
3. Validate the exact origin and conversation ID, then retrieve and validate the selected branch.
4. Format locally and offer the file for saving.
5. Report completion accurately and show the optional support link. A cancelled or failed save must not display success.
6. Release temporary resources.

Do not recreate ChatGPT's UI. Use native controls and a small, accessible layout.

## Phase 3: security requirements

### Access and data flow

- Retrieve only the current conversation and its required chunks; never enumerate unrelated conversations or projects.
- Use existing browser authentication only as needed for retrieval. Never persist credentials or log them. Avoid handling raw tokens; if the investigation proves transient token handling unavoidable, document and review that design before implementation.
- No cookies API, debugger permission, broad host permissions, native messaging, or filesystem browsing.
- No telemetry, error-report uploads, analytics, remote configuration, external fonts, CDN scripts, or developer-operated backend.
- Do not download remote images, citation pages, or attachments for text exports. Preserve safe references or mark unsupported material explicitly.
- Keep conversation data in memory only for the export. No localStorage, IndexedDB, extension storage, or retained conversation cache.

### Defensive implementation

- Validate URLs through parsed origin equality, never string prefixes. Validate conversation identifiers and redirect behavior.
- Validate response shapes, selected-branch links, cycles, duplicate nodes, and missing content.
- Bound retries and processing. A limit must produce an explicit incomplete/error result rather than truncate silently.
- Treat messages as untrusted data: no eval, dynamic code generation, or insertion of conversation HTML into the extension UI.
- Sanitize filenames and prevent content from influencing paths, executable code, or network destinations.
- Apply a restrictive extension CSP, with no remote execution. Document that this CSP does not govern all code or requests in the ChatGPT page itself.
- Clear temporary references and revoke object URLs. Do not claim guaranteed secure erasure of JavaScript memory.
- The optional support link uses a fixed public HTTPS URL, no content-derived query parameters, no referrer, and no opener access. No payment code or embedded widgets.

### Honest security claims

Use claims such as "Open source. Local processing. Inspectable code."

OSS alone is not verification. A security claim must identify the reviewed version, the checks performed, and their limitations. Chrome site access does not enforce a one-conversation boundary; current-conversation-only behavior is an implementation restriction. Clicking to activate and disabling afterward reduces exposure but does not make malicious code safe while active.

A separate browser profile does not isolate conversations within the same signed-in ChatGPT account. Avoid suggesting otherwise.

## Phase 4: meaningful verification

Use Node's built-in test runner for the pure formatter and synthetic conversation fixtures. Use Playwright for browser integration. Keep test tooling out of the shipped extension.

Required cases:

- Long conversations whose earlier messages are absent from the DOM.
- Pagination, overlapping chunks, missing chunks, duplicate IDs, cycles, and interrupted retrieval.
- Edited prompts, regenerated replies, branch changes, and conversation navigation during export.
- Japanese, emoji, multiline code, tables, and citation links.
- Unsupported attachments, unknown message types, and ongoing generation.
- Wrong origin, malformed IDs, incorrect conversation responses, and authentication failures.
- Cancelled downloads, closed popups, exhausted retries, and unsupported page layouts.

Security checks:

- Inspect exporter-attributable traffic and separate it from ChatGPT's ordinary traffic.
- Confirm no third-party requests during export and no unrelated conversation retrieval.
- Confirm no content or credentials in console output, persistent storage, or packaged fixtures.
- Confirm message content cannot become executable HTML or redirect retrieval.
- Confirm the support destination opens only after a deliberate click and receives no chat-derived data.
- Inspect the packaged manifest and every packaged file; test the release package as well as the source checkout.

Passing browser tests provides evidence for a specific version and environment, not a universal security guarantee.

## Phase 5: self-use and distribution

Provide a readable source directory users can load directly with Chrome's Load unpacked option. If a build becomes necessary, document the exact pnpm commands and why that build exists.

Keep repository documentation concise:

- README: purpose, supported scope, self-loading instructions, export behavior, limitations, and permission explanations.
- Privacy policy: actual data flow, local processing, lack of retention, and the explicitly optional external support link.
- SECURITY.md: threat model, responsible reporting route, verification evidence, and limits.
- LICENSE and synthetic tests.

Release requirements:

- Generate the Chrome Web Store ZIP from the same tagged source offered for self-use.
- Publish the source commit, packaged file inventory, and ZIP SHA-256. Explain that a checksum establishes artifact identity, not security.
- Keep packaging deterministic where practical and exclude development files, profiles, credentials, and real data.
- Pin development dependencies in a lockfile and pin third-party CI actions to reviewed commits if CI is added.
- Protect personal publishing accounts with strong authentication and minimize release credentials.
- No hidden store-only behavior, obfuscation, or remote updates outside Chrome's normal mechanism.
- Explain that store installations may update automatically, while users control updates to locally loaded source.
- Review current Chrome Web Store policy and branding requirements before submission.

## Release gate

Ship only when complete selected-branch extraction, local-only processing, clear failure behavior, and source-to-package correspondence have been demonstrated.

If ChatGPT changes and the assumptions stop holding, fail clearly. Do not silently degrade into partial exports. Prefer removing features to adding complexity that cannot be justified by the core task.

## References

- Chrome activeTab: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome network requests: https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- Chrome Web Store policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Playwright Chrome extensions: https://playwright.dev/docs/chrome-extensions

Recheck technical references during implementation. ChatGPT's internal conversation interfaces are not a stable public API contract.
