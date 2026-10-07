# Security

## Current status

Private prototype 0.1.0. Live retrieval is disabled. No external security audit has been completed. Passing tests of synthetic conversations does not establish that ChatGPT retrieval works, that every browser behaves identically, or that the extension is universally safe.

## Threat model

Protect private conversation content, authentication, and the user's expectation of a complete selected branch. Treat page data, conversation text, links and filenames as untrusted. Defend against wrong-origin access, mixed branches, missing nodes, cycles, unexpected content, silent truncation, executable UI injection, unsafe filenames, misleading save confirmation and third-party data transfer.

The prototype uses exact origin/path checks, bounded schema validation, a verified internal parent chain, explicit omission records, text-only DOM updates, escaped metadata headers, restricted filenames, a local-only CSP, and a fixed no-referrer support link. The source has no runtime dependencies. The CSP applies to extension pages, not ChatGPT itself or another application opening exported Markdown.

The current internal model is not an authenticated statement from ChatGPT. Its completeness flags must eventually be derived from observed retrieval evidence by a reviewed adapter, never trusted merely because a remote response supplies a similarly named field.

`activeTab` grants temporary site access; it is not a one-conversation security boundary. The `downloads` permission is broader than the specific ID queried here. A separate profile does not isolate conversations within the same ChatGPT account. Malicious extensions, a compromised browser or account, local file readers, and vulnerabilities in Markdown editors remain outside this project's guarantees.

## Verification

Run `pnpm test`, `pnpm test:browser`, and `pnpm check`. The unit suite checks branch validation, omitted content, multilingual output, single-file metadata preservation, filenames and save lifecycle races. Browser tests exercise the synthetic user journey; they do not replace live ChatGPT checks. Packaging uses an explicit inventory and records SHA-256 and source commit. Inspect every packaged file and test the extracted artifact before release.

Do not retain real conversations, credentials, profile files, screenshots, network captures or traces in Git. Browser tracing is disabled. Use an external dedicated profile for manually signed-in testing. Never request pasted authentication tokens. Do not print raw browser/network errors that may contain private data.

## Reporting

Before publication, activate `chat-simple-export@ongaku.co.uk` and enable private GitHub vulnerability reporting. Until then this repository remains private. Report the affected version, browser, operating system and synthetic reproduction. Do not attach authentication tokens, real transcripts or session captures. Public GitHub issues are not a safe place for secrets.

## Release blockers

See [RELEASE.md](docs/RELEASE.md). Live data retrieval, selected-branch correspondence, exporter-attributable network traffic, real save-dialogue behaviour across target platforms, support routing, licence terms and a repository-history secret review remain mandatory gates.
