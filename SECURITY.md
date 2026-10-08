# Security

## Current status

Production release 0.2.0; Chrome Web Store publication is tracked separately. Licensed under [MIT + Commons Clause v1.0](LICENSE), with attribution to @taiyodayo. Source is provided for security inspection. Rendered-page extraction is implemented; server-side history completeness is not established. No external security audit has been completed. Passing tests of synthetic conversations does not establish that live provider retrieval works, that every browser behaves identically, or that the extension is universally safe.

## Threat model

Protect private conversation content, authentication, and the user's expectation of a complete selected branch. Treat page data, conversation text, links and filenames as untrusted. Defend against wrong-origin access, mixed branches, missing nodes, cycles, unexpected content, silent truncation, executable UI injection, unsafe filenames, misleading save confirmation and third-party data transfer.

The extension uses exact origin/path checks, bounded schema validation, a verified internal parent chain, explicit omission records, text-only DOM updates, escaped metadata headers, restricted filenames, a local-only CSP, and a fixed no-referrer support link. The source has no runtime dependencies. The CSP applies to extension pages, not the chat apps themselves or another application opening exported Markdown.

The current internal model is not an authenticated statement from ChatGPT. Its completeness flags are derived from observed rendering and stability checks; they do not prove server-side history completeness.

`activeTab` grants temporary site access; it is not a one-conversation security boundary. The `downloads` permission is broader than the specific ID queried here. A separate profile does not isolate conversations within the same chat account. Malicious extensions, a compromised browser or account, local file readers, and vulnerabilities in Markdown editors remain outside this project's guarantees.

Deep Research optionally requests the detected report’s exact `mcp-app-<hex>.web-sandbox.oaiusercontent.com` HTTPS origin. This access persists in Chrome and covers more than one report. Injection is limited in code to matching frames in the clicked tab. The report reader runs in `MAIN`, whose globals and report component fields are untrusted page data; it reads only the observed report fields and makes no network requests. Bounded traversal, completion/stability checks, validated citation ranges, safe source URLs and normal conversation revalidation reject unsupported or changing data. Unknown report components or reference types fail explicitly. The extension-page CSP does not protect this script in the report’s world.

The requested native folder picker uses the File System Access API with read/write access to the chosen directory. The handle is kept only in memory. Custom-folder saves validate filenames, probe only candidate names, use bounded collision handling, and await the writable stream’s close before reporting success. Cancellation and timeout abort pending writers, including late-opening streams. Creating a file handle can leave an empty placeholder after failure. Existence checking and file creation are separate operations, so another application creating the same filename concurrently remains a filesystem race; exclusive writable streams prevent overlapping writers where supported.

## Verification

Run `pnpm test`, `pnpm test:browser`, and `pnpm check`. The unit suite checks branch validation, omitted content, multilingual output, single-file metadata preservation, filenames and save lifecycle races. Browser tests exercise the synthetic user journey; they do not replace live provider checks. Packaging uses an explicit inventory and records SHA-256 and source commit. Inspect every packaged file and test the extracted artifact before release.

Do not retain real conversations, credentials, profile files, screenshots, network captures or traces in Git. Browser tracing is disabled. Use an external dedicated profile for manually signed-in testing. Never request pasted authentication tokens. Do not print raw browser/network errors that may contain private data.

## Reporting

Use [private vulnerability reporting](https://github.com/taiyodayo/simple-ai-chat-export/security/advisories/new) for security issues. Report the affected version, browser, operating system and a synthetic reproduction. Do not attach authentication tokens, real transcripts or session captures. Public GitHub issues are suitable for ordinary bugs and are not a safe place for secrets.

## Publication and verification

See [RELEASE.md](docs/RELEASE.md). The verification record distinguishes tested behaviour from remaining platform and long-history limits. Production status does not imply an external audit or Chrome Web Store approval.
