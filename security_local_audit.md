# Local security assessment of the project's security claim

**Historical snapshot of 0.2.1, not the current repository status.** The observations below were made before the subsequent hardening changes. Evidence links are pinned to the assessed commit. Current implementation and repository-control checks are recorded in [VERIFICATION.md](docs/VERIFICATION.md). This report preserves the original measurements and conclusion.

Assessment date: 8 October 2026. Fresh repository/platform checks completed around 07:46 UTC. This assessment was requested after the independent adversarial reviews and the 0.2.1 fixes.

**Verdict: the implementation provides evidence of deliberate security controls, but the quoted statement is not substantiated as written.** Its claim of maximum practicable safety exceeds the evidence, and several available repository/release safeguards are demonstrably absent. This is an internal assessment, not an external certification.

## Statement being assessed

> this extension is designed and implemented with the best of security in mind, and is made as realistically as safe as possible within boundaries allowed for Chrome extension and github

| Part of the statement                                       | Evidence-based assessment                                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security is considered in the design and implementation     | Supported by the documented threat model, narrow required permissions, restrictive extension-page CSP, local processing, input validation, explicit failure states, and tested remediation of concrete defects. These demonstrate engineering choices; they cannot establish someone's private intentions. |
| “the best of security”                                      | No defined comparison, security standard, independent certification, or exhaustive proof establishes “best.” The evidence supports naming specific controls, not a comparative superlative.                                                                                                                |
| “as realistically as safe as possible”                      | Not established. GitHub reports an unprotected default branch, no repository rulesets, disabled security features described below, and a mutable release. The packager accepts dirty source. Those are project-controlled conditions, not unavoidable Chrome limitations.                                  |
| “within boundaries allowed for Chrome extension and github” | Some remaining boundaries are genuine: origin-scoped grants, MAIN-world execution, publisher/update trust, external file writers, and downstream viewers. Those boundaries do not account for all remaining hardening opportunities.                                                                       |

## Scope and identity of the evidence

The source assessed is production version **0.2.1**, commit **`2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526`**, on `main` in [taiyodayo/simple-ai-chat-export](https://github.com/taiyodayo/simple-ai-chat-export/tree/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526). The working tree was clean before this document was added.

The existing local release ZIP was examined without rebuilding or modifying it:

```text
Artifact: dist/simple-ai-chat-export-0.2.1.zip
SHA-256: 9aab968ff054b96075f9f9f6707c3e150909bd21a644eee7388c78ecb3eedf2e
Entries: 17
```

Every ZIP entry matched both the checked-out file and its bytes in the assessed Git commit. The root `LICENSE` is packaged as `LICENSE`; the other 16 entries come from `extension/`. The GitHub release API reports the same digest for its ZIP asset. This establishes the identity of the local artifact and the digest reported by GitHub. It does **not** independently establish the bytes of an installed Chrome Web Store CRX, nor authenticate GitHub against compromise.

Evidence falls into three distinct categories:

1. **Fresh observation:** source/configuration inspection, ZIP comparisons, GitHub read-only API responses, 60 passing unit tests, the limited source checker, and the synthetic browser probes reproduced below.
2. **Recorded earlier verification:** the independent reports, 50 passing browser cases, live structural provider checks, and website checks in [the complete audit](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/docs/ADVERSARIAL_REVIEWS_2026-10-08.md) and [verification record](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/docs/VERIFICATION.md). The entire browser suite and live signed-in flows were not rerun for this document.
3. **Platform semantics:** primary Chrome and GitHub documentation linked next to the relevant conclusions.

No real conversation, credential, signed-in profile, or store dashboard was used in the fresh probes. No repository security setting or publication setting was changed for this assessment.

## What the current implementation actually protects

### Permission and activation boundaries

[manifest.json](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/manifest.json), lines 13–22, declares only `activeTab` and `scripting` as required permissions. It has no required host permissions, static content scripts, web-accessible resources, or `externally_connectable` declaration. No `downloads`, `cookies`, `storage`, `history`, `webRequest`, or `tabs` permission is requested. The optional host pattern is restricted to the OpenAI report sandbox domain.

[launch.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/launch.js) contains one action-click handler that opens the local export window. Conversation retrieval starts through the export form handler in [popup.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/popup.js), rather than a background monitor. Ordinary page reading uses Chrome's default isolated execution world. These controls narrow when and where the shipped reader operates.

However, `activeTab` is a browser grant to the invoked tab's origin, not a grant to one conversation ID. Access can survive same-origin navigation. Exact conversation restrictions are enforced by this project's code, not by a Chrome permission that makes other messages inaccessible. This distinction follows both [Chrome's activeTab documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and the route checks in [core.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/core.js), lines 15–41.

For Deep Research, [researchOrigin](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/research.js) accepts the specific HTTPS `mcp-app-<hex>.web-sandbox.oaiusercontent.com` hostname pattern and rejects credentials and non-default ports. [retrieval.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/retrieval.js) derives exact origin requests from detected frames. [popup.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/popup.js) requests them from the explicit permission/export click. The declared wildcard is wider than each actual request. Granted report access persists in Chrome and is wider than one report; the implementation's chosen-tab/frame checks provide the additional restriction. The grant is not automatically removed after export.

**Finding:** the required permissions and shipped activation path are narrow. Neither temporary tab access nor optional report access is a cryptographic or browser-enforced one-conversation boundary.

### Privileged UI and executable-content boundaries

The extension-page CSP is:

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self';
connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';
frame-ancestors 'none'
```

The popup writes status, destination names, and folder errors with `textContent`; it does not insert conversation HTML into the privileged interface. The reviewed package has no remote executable code or runtime npm dependencies. The limited source checker rejects several dangerous runtime patterns, including dynamic evaluation, `innerHTML` assignment, and persistent-storage references in extension JS/HTML.

The earlier [untrusted-HTML browser test](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/tests/browser/journey.spec.js) checks that synthetic message HTML does not enter the interface or trigger the test's attacker URL. The fresh capability probe below also confirms that a direct extension-page `fetch` is blocked by the unchanged CSP.

These observations support a specific defense against the reviewed DOM-to-popup injection path. They do not prove that every JavaScript execution or outbound channel is blocked. Deep Research deliberately runs in `MAIN`, whose JavaScript environment is shared with the report page. Chrome documents that distinction in its [scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting). The extension-page CSP cannot be treated as a security policy for that page's execution environment.

### Untrusted input, output integrity, and availability

| Control                                                                                                       | Source evidence                                                                                                                                                                                                                                                                                        | Actual limit of the control                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact supported HTTPS origins and conversation routes; credential rejection                                   | `conversationLocation` in [core.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/core.js), lines 15–41                                                                                                                                   | Establishes the URL accepted by the implementation; does not authenticate provider text.                                                                                                        |
| Approved roles/content types, duplicate/cycle rejection, validated parent chain, fresh approved output fields | `validateConversation` in [core.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/core.js), lines 44–182                                                                                                                                  | Validates the internal model, which is constructed from rendered messages; it is not a server-issued history proof.                                                                             |
| Message reread and SHA-256 fingerprint before saving                                                          | [retrieval.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/retrieval.js), lines 109–158; [popup.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/popup.js), lines 216–226 | Detects changes visible to those reads. The message hash excludes the title and does not freeze the page after the last read.                                                                   |
| Text, tree, depth, table, message and source limits; iterative code fences                                    | [page-reader.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/page-reader.js), lines 58–175, 220–245 and 429–433                                                                                                                         | Rejects specified oversized shapes. The 20-million limit measures JavaScript string length, not a universal byte/CPU/memory bound. Some DOM collection/allocation happens before a limit check. |
| Research field selection, completion/stability checks, citation range/overlap checks, bounded source URLs     | [research.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/research.js)                                                                                                                                                                  | Rejects unsupported structures and observed changes; page-controlled properties and globals remain untrusted.                                                                                   |
| Abort/deadline races around injection and permission-presence checks                                          | [retrieval.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/retrieval.js), lines 11–24, 36–42 and 79–83                                                                                                                                  | Releases the caller and discards late results. Does not terminate injected JavaScript or preempt synchronous renderer work.                                                                     |
| Generic internal error codes instead of raw browser error display                                             | [retrieval.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/retrieval.js), lines 43–52; [popup.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/popup.js), lines 237–247   | Avoids the reviewed private-URL error disclosure path; it is not an exhaustive logging analysis of Chrome or the OS.                                                                            |

The retrieval deadline is **30 seconds per wrapped operation**, not a maximum duration for the whole export. Initial/revalidation `chrome.tabs.get`, the actual `chrome.permissions.request` prompt, and the folder picker are not wrapped by `waitForRead`. Thus “every operation can be cancelled immediately” would also exceed the implementation.

### File-writing boundaries

[safeFilename](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/core.js) normalizes Unicode, restricts length, removes path/control/directional characters, and handles reserved names. `createExport` only generates `.md` or `.txt` files. [saveFile](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/extension/save.js), lines 13–21, independently rejects unsafe filenames before either save path.

Ordinary Downloads exports use a local Blob and a temporary download anchor. There is no downloads API. The UI reports **Download started** and explicitly states that completion is not confirmed. The object URL is revoked after a one-second handoff grace period, or immediately on failure. That accurately separates initiation from verified completion.

Custom-folder exports hold the same origin-wide exclusive Web Lock from candidate-name checks through stream close/abort. The writer checks only candidate names, does not enumerate the directory or read existing file contents, and reports `saved` after `close`. Cancellation/deadline handling also covers queued saves and late-opening streams.

This fixes the demonstrated collision between this extension's windows. It does not provide atomic creation against external applications, other origins, or browser profiles. Candidate existence lookup and `{create:true}` remain separate operations. An empty placeholder can remain after failure; a committed file cannot be rolled back by a late cancellation. These are documented residuals, not a fresh demonstration of overwritten external files.

The native directory request is `mode: "readwrite"`, with the handle retained in window memory. Its capability is broader than the shipped writer's behavior. Chrome's [File System Access documentation](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access) describes directory access and writable streams; the source shows the selected scope and actual operations. This implementation does not offer a write-only, one-future-file directory capability.

## Fresh adversarial verification of 0.2.1

The existing [security reproduction](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/docs/audit/reproductions/security-021.mjs) was rerun against current source. It exited successfully with the following relevant observations:

```json
{
  "directoryRace": {
    "filenames": ["Conversation.md", "Conversation (1).md"],
    "firstContent": "FIRST EXPORT MUST SURVIVE",
    "secondContent": "SECOND EXPORT",
    "firstExportLost": false
  },
  "backtickRuns": {
    "characters": 260000,
    "messageCount": 2,
    "codePreserved": true
  },
  "markdownActivation": {
    "inertPageHasImages": 0,
    "rawHtmlPreserved": true,
    "rawScriptPreserved": true
  },
  "mainWorldHang": "still-pending-after-250ms",
  "cancelPendingInjection": "rejected:cancelled",
  "injectionDeadline": "read-timeout"
}
```

This is a shortened transcription of the measured output, with the two saved contents and filenames retained. It demonstrates that the original same-origin save race and backtick argument-overflow case are fixed, and that the caller escapes a hanging injection on cancellation/deadline. It also demonstrates that raw inert HTML is still preserved in Markdown. It does not demonstrate an exploit in the popup or actual execution in an external editor.

The latter is a deliberate fidelity boundary: Markdown bodies are exported as data rather than sanitized for arbitrary future consumers. A viewer that activates raw HTML or remote images applies its own policy. TXT and the documented advice to disable those viewer features are available; no claim that exported Markdown is universally safe to render is supported. See the original S4 proof and its qualification in [the complete audit](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/docs/ADVERSARIAL_REVIEWS_2026-10-08.md).

Fresh commands also passed:

```text
node --test tests/*.test.js                         60 passed; 0 failed
node scripts/check.js                             114 files checked; passed
node docs/audit/reproductions/security-021.mjs      passed
```

The checker expressly describes itself as limited. Its small regex set and syntax/manifest checks do not replace a full secret scanner, code analysis, or a historical Git audit.

## Data handling and the malicious-publisher question

### Current behavior

The reviewed shipped source contains no conversation-upload implementation, analytics, telemetry, developer backend, remote configuration, retained conversation cache, `localStorage`, IndexedDB, or Chrome storage use. Its conversation path reads rendered data, constructs output locally, revalidates, and writes the requested file. The fixed coffee URL has `noopener noreferrer` and `no-referrer` and receives no appended conversation data. Help is packaged locally.

This supports the version-scoped statement **“the reviewed extension processes exports locally and does not upload conversations or retain a conversation cache.”** It does not support **“no data is stored anywhere.”** Exported plaintext files are storage. They include a title/filename and metadata such as the conversation URL and message identifiers. Temporary plaintext exists in JavaScript memory. Chrome can retain download records, report-origin grants, and picker metadata. Selected folders can be synced or backed up by other software. JavaScript garbage collection is not a demonstrated secure-erasure mechanism. These distinctions are already made in [PRIVACY.md](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/PRIVACY.md).

The optional support email, GitHub reporting, website hosting, and coffee destination are separate disclosed interactions. The source and recorded website checks establish the absence of application analytics scripts; they do not establish the absence of Cloudflare/GitHub/mail/payment-provider infrastructure logs. Provider processing is not evidence that the extension secretly uploads chats, but it prevents expanding its local-processing claim into an unconditional claim covering all project interactions.

### Fresh unchanged-manifest capability proof

The earlier privacy experiment used 0.2.0, which had `downloads`. For this assessment it was adapted to extract **the exact 0.2.1 ZIP**, omit the downloads POST operation, and report whether the downloads API exists. The browser was bundled Chromium **153.0.8010.12**, using a fresh temporary profile and a loopback HTTP receiver. Neither the manifest nor shipped JavaScript was edited. Test JavaScript was evaluated in the extension page to represent code a malicious version could execute; it is **not** shipped exporter behavior.

Observed output:

```json
{
  "permissions": {
    "origins": [],
    "permissions": ["activeTab", "scripting"]
  },
  "fetchResult": "blocked",
  "downloadsApiAvailable": false,
  "navigationTabCreated": true,
  "localStorageAfterReload": "SYNTHETIC_LOCAL_RETENTION_MARKER",
  "requests": [
    {
      "method": "GET",
      "path": "/sink?marker=SYNTHETIC_NAVIGATION_MARKER",
      "body": ""
    }
  ]
}
```

The exact evaluated actions were:

```js
// Direct connection: rejected by the unchanged extension-page CSP.
await fetch(loopbackSink, {
  method: "POST",
  body: "SYNTHETIC_FETCH_MARKER",
});

// Independent actions, evaluated after catching the fetch rejection:
localStorage.setItem(
  "synthetic-privacy-probe",
  "SYNTHETIC_LOCAL_RETENTION_MARKER",
);
await chrome.tabs.create({
  url: loopbackSink + "?marker=SYNTHETIC_NAVIGATION_MARKER",
  active: false,
});
// Reload the extension page, then read the same localStorage key.
```

The receiver observed the navigation marker; the storage marker survived page reload. No real chat was read. This proves two capabilities under the current configuration, not secret data collection by the current release. The available [earlier reproduction](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/docs/audit/reproductions/privacy-020.mjs) contains the setup and cleanup; the only substantive 0.2.1 changes are the ZIP selection and removal of its obsolete downloads test.

A second run also recorded a browser `securitypolicyviolation` event with `effectiveDirective: "connect-src"` and the loopback sink as `blockedURI`. This attributes the direct-fetch rejection to CSP rather than assuming that a generic fetch error proves the cause. The navigation marker still reached the receiver in that run.

Chrome explicitly states that creating or navigating tabs does not generally require the `tabs` permission. The permission controls certain sensitive tab properties, rather than access to the entire API. See [the Tabs API permissions documentation](https://developer.chrome.com/docs/extensions/reference/api/tabs).

**Conclusion from this experiment:** `connect-src 'none'` and absence of `storage`/`tabs`/`downloads` permissions do not make retention or transmission technically impossible for arbitrary extension code. A code change can use the demonstrated storage/navigation paths without those additional permissions or a CSP change. Whether Chrome Web Store review would catch a particular malicious update was not tested. The publisher/update trust boundary remains, even though the current reader does not use these paths. Public source does not enforce the behavior of all future builds.

## GitHub and release controls: direct observations

The following were queried read-only using the authenticated `gh` client. No settings were altered. Results describe the observed repository state, not the security of the owner's whole GitHub account.

| Observation                                                | Direct evidence                                                                                                                | Security implication supported by that evidence                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public repository; private vulnerability reporting enabled | Repository API: `visibility: "public"`; private-vulnerability-reporting API: `enabled: true`                                   | Source inspection and a private issue-reporting path are available.                                                                                                         |
| Default branch is unprotected                              | Branch API: `protected: false`; `protection.enabled: false`; required status-check enforcement `off`                           | The observed branch settings do not enforce protected-branch review or passing checks. This is not an allegation of unauthorized access.                                    |
| No repository rulesets returned                            | Rulesets API: `[]`, count `0`                                                                                                  | No ruleset was reported by that endpoint. The absence is not a browser limitation.                                                                                          |
| Security scanning flags reported disabled                  | Repository API: `secret_scanning`, `secret_scanning_push_protection`, non-provider patterns and validity checks all `disabled` | Those repository flags do not evidence configured scanning/push-protection safeguards. They do not prove GitHub performs no platform-wide scanning.                         |
| Automatic Dependabot security updates disabled             | Repository API: `dependabot_security_updates.status: "disabled"`                                                               | Automatic dependency security updates are not enabled in the observed repository configuration. Runtime dependencies are absent, but development tools remain dependencies. |
| Dependabot alerts endpoint unsuccessful                    | HTTP 403: `Dependabot alerts are disabled for this repository.` The CLI also reports a missing scope.                          | The response reports disabled alerts; alert inventory could not be inspected. No conclusion about zero vulnerable dependencies follows.                                     |
| No code-scanning analysis returned                         | Code-scanning alerts endpoint: HTTP 404, `no analysis found`                                                                   | No analysis was obtainable through this query. This is not proof of no vulnerability or no scanning by any other service.                                                   |
| No tracked GitHub workflow files                           | `git ls-files .github` returned no paths                                                                                       | This commit contains no repository-defined GitHub Actions workflow. Local successful tests are recorded; branch settings do not require them.                               |
| v0.2.1 tag has no cryptographic signature                  | `git verify-tag v0.2.1`: `error: no signature found`; tag object points to the assessed commit                                 | The annotated tag is not a signed provenance statement. This does not negate the ZIP byte comparison.                                                                       |
| Published release is mutable                               | Release API: `draft: false`, `prerelease: false`, `immutable: false`                                                           | GitHub does not report this release as immutable.                                                                                                                           |
| ZIP digest matches the local artifact                      | Release asset digest equals the independently computed local ZIP SHA-256 above                                                 | Establishes digest agreement at inspection time, not independently authenticated provenance against the release account itself.                                             |

The queries can be reproduced without accessing private conversations:

```sh
gh api repos/taiyodayo/simple-ai-chat-export \
  --jq '{visibility,default_branch,security_and_analysis}'
gh api repos/taiyodayo/simple-ai-chat-export/private-vulnerability-reporting
gh api repos/taiyodayo/simple-ai-chat-export/branches/main \
  --jq '{name,protected,protection}'
gh api repos/taiyodayo/simple-ai-chat-export/rulesets
gh api repos/taiyodayo/simple-ai-chat-export/code-scanning/alerts
gh api repos/taiyodayo/simple-ai-chat-export/dependabot/alerts
gh api repos/taiyodayo/simple-ai-chat-export/releases/tags/v0.2.1 \
  --jq '{tag_name,draft,prerelease,immutable,assets:[.assets[]|{name,digest}]}'
git verify-tag v0.2.1
```

GitHub documents [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) as available for public repositories on GitHub Free. Thus the absent branch safeguard cannot be dismissed as outside GitHub's available boundaries.

There is an important qualification to the scanner flags: GitHub's [secret-scanning documentation](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) describes automatic free scanning for public repositories. Its [push-protection documentation](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) also distinguishes repository protection from protection for individual users. The repository API flags do not settle all of those platform/account mechanisms. This assessment therefore reports the observed flags and does **not** claim “GitHub scans nothing” or “the owner has no user-level push protection.”

Publisher/account MFA, recovery settings, session security, collaborator security, release attestations, and the actual store-delivered package were not independently verified. There is no basis here to label those controls enabled or disabled.

## Remaining project-controlled opportunities

These are evidence-linked opportunities, not claims that an attacker has exploited them, and not changes performed by this assessment.

1. **Enforce release checks through repository controls.** `main` is unprotected, no rulesets were returned, and the commit has no workflow files. A minimal test/check workflow and appropriate branch enforcement would add controls presently absent. A solo-maintainer policy should remain usable; requiring impossible independent approvals is not necessary to establish enforced automated checks.
2. **Review and configure available scanning/update safeguards.** The repository API reports disabled scanner/push-protection and Dependabot security-update flags. The local checker recognizes only a small set of patterns. Platform/account scanning coverage should be confirmed rather than assumed from either the API flags or general documentation.
3. **Tighten release provenance and source eligibility.** [package.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/scripts/package.js), lines 49–76, records a dirty tree but still writes the ZIP. Rejecting dirty release builds is possible in this code. The tag is unsigned and the release API reports mutable state. Signing/provenance and available release controls would address different aspects of the artifact trust boundary; a neighboring checksum alone does not authenticate its publisher.
4. **Decide whether further output isolation is worth the fidelity tradeoff.** The fresh probe confirms literal HTML preservation. A deliberately more restrictive export policy could reduce downstream activation, but would alter content. Existing TXT/help mitigations are real; they are not a universal Markdown sanitizer.
5. **Keep development-only serving boundaries explicit.** [preview.js](https://github.com/taiyodayo/simple-ai-chat-export/blob/2bdcd5a8a82f9da1ec24d34b2eb36c379dbbc526/scripts/preview.js) binds to `127.0.0.1` and checks lexical directory prefixes, but has no Host validation or realpath/symlink containment check. The earlier audit identified those omissions without demonstrating a leak. The preview is excluded from the extension ZIP; no production extension exploit is established by this observation.

These controls would not eliminate browser/provider/OS trust or make a malicious publisher technically unable to change code. Their present absence nevertheless prevents an evidence-based claim that all practical safeguards available within Chrome and GitHub have been implemented.

## What this assessment cannot conclude

There is no evidence here establishing a universal absence of vulnerabilities, a maximum attainable security level, future-update honesty, authenticated provider history completeness, securely erased memory, safe behavior of every Markdown viewer, or security of every user's browser/OS. The synthetic tests do not exhaust all payloads or concurrency schedules. Existing browser integration tests sometimes add temporary host permissions to substitute for toolbar gestures; those test grants are excluded from the distributed manifest and do not independently verify every native permission interaction.

The previous live provider observations and native-picker checks have their recorded scope. They do not amount to exhaustive Windows/Linux/browser-version testing, a formal accessibility/security certification, or inspection of an installed store CRX. No finding about a disabled repository setting is evidence of an actual account compromise. No lack of an observed exploit is proof that one cannot exist.

## Evidence-based conclusion

**The quoted statement should not be used as an unqualified factual security claim.** The assessed 0.2.1 source and matching ZIP implement narrow required permissions, user-triggered reading, a restrictive privileged-page CSP, text-only interface updates, bounded validation, local file generation, revalidation, and concrete tested fixes. Fresh tests confirm the repaired same-origin save race, preservation of the adversarial backtick payload, and cancellation/deadline escape from unresolved injection. Those facts support a claim of deliberate, tested security measures for this release.

The stronger claim is not established: available GitHub branch/release safeguards are absent in direct read-back; the packager permits dirty source; raw HTML remains in Markdown; and the unchanged 0.2.1 permissions/CSP allow synthetic local retention and data-bearing navigation when arbitrary test code is evaluated. The current exporter does not use those retention/transmission paths. Their demonstrated availability prevents a claim that publisher data theft is technically impossible.

A statement supported by the examined evidence is:

> Version 0.2.1 processes exports locally and uses limited permissions, a restrictive extension-page policy, input validation, and tested security fixes. No conversation-upload path or retained conversation cache was found in the reviewed release. Its source is public for inspection. This is an internal review, not a guarantee against all attacks or future updates; Chrome, publisher, provider, operating-system, and exported-file trust boundaries remain.

That conclusion is release-specific. It follows from the observed source, byte comparisons, test results and platform read-back; it does not require an assumption that the project is either maximally secure or secretly collecting data.
