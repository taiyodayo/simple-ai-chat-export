# Retrieval decision gate

Status: **not passed**. The owner requested a prototype before providing a manually signed-in test profile. This supersedes the original timing of Phase 1, not its evidence requirement.

No private ChatGPT endpoint, DOM selector, raw token path or assumed `current_node` has been implemented. `extension/retrieval.js` validates the route and returns `verification-pending`. The schema in `core.js` is an internal contract tested with synthetic fixtures, not an assertion about ChatGPT's server format. There is no production fallback strategy.

## Required live evidence

1. Open a long synthetic conversation and observe retrieval as earlier messages load. Record request shapes and pagination behaviour without retaining credentials or private content.
2. Identify the saved conversation and the branch actually displayed. Change an edited prompt and a regenerated answer independently. Prove that the selected leaf tracks the visible choice, not just a server default.
3. Demonstrate full data retrieval including any continuation pages. Establish the root and leaf, unbroken parent chain, stable state, no missing links and resolved pagination.
4. Observe in-progress generation, same-conversation branch changes, navigation, sign-out, permission loss, missing/overlapping chunks and interruption. A changed snapshot must be rejected before saving.
5. Decide the single supported extraction strategy and document required permissions, authentication, redirect restrictions, bounds and cancellation. If safe complete retrieval is unavailable, leave export blocked.
6. Implement the adapter only after the decision is documented. Revalidate branch and navigation after retrieval and again after an omission-confirmation pause.

Never ask the owner to paste a token. Avoid raw token handling. If unavoidable, document the transient path and review it before implementation. Do not save response dumps in the repository.

## Save decision

A browser anchor download does not provide reliable completion/cancellation confirmation. The File System Access API would require supported picker behaviour and a second action after asynchronous retrieval, and does not provide the same portability across target Chromium browsers. Use `downloads`, with `saveAs: true`, and observe only the returned download ID. Confirm only `complete`; treat `interrupted`, rejected saves and timeouts as non-success. An event-driven service worker opens a small window so a toolbar popup closing does not discard the job. Closing the window aborts unfinished work; a file that already completed may remain.

One ZIP contains the editable transcript and a separate metadata file. This avoids two save dialogues and keeps the archive together. ZIP uses stored UTF-8 entries and fixed safe names. No conversation-derived paths are accepted.

## Current references checked 7 October 2026

- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome downloads](https://developer.chrome.com/docs/extensions/reference/api/downloads)
- [Playwright extensions](https://playwright.dev/docs/chrome-extensions)
- [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies)

These document browser capabilities, not ChatGPT's private interfaces. The release must be checked against then-current store policy.
