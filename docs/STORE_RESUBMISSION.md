# Resubmit version 0.2.2

Use existing item `hnolfghceldfcghkcfnfafainiiodkhl`. Version 0.2.0 was rejected with Purple Potassium for requesting downloads. The replacement removes that permission/API entirely; exports use normal local Blob download links or user-selected folder writes.

1. Open the item's **Package** tab and upload `dist/simple-ai-chat-export-0.2.2.zip`.
2. Confirm version **0.2.2** and permissions **activeTab** and **scripting**. Optional Deep Research sandbox access remains unchanged. There must be no downloads permission.
3. In **Privacy practices**, remove any obsolete downloads justification left after upload. Keep the single purpose, activeTab/scripting justifications and privacy URL. Select **No remote code**.
4. Keep **Personal communications**, **Web history** and **Website content** selected: local processing still requires disclosure. Keep all three Limited Use certifications checked.
5. In **Store listing**, paste the updated detailed description from [store/description.txt](../store/description.txt).
6. Replace the listing screenshots with `store/assets/01-export.png` and `store/assets/02-saved.png`; these show version 0.2.2 and truthful Download started status.
7. Replace reviewer instructions with [store/reviewer-instructions.txt](../store/reviewer-instructions.txt), which fits the 500-character field. It explicitly explains the permission removal and test flow.
8. Save the draft and submit for review. Choose automatic publication after approval if desired. Keep the existing verified public contact; the owner handles publisher declarations and account details.

If a response/appeal text field is offered, use:

> Version 0.2.2 requests no downloads permission and has no chrome.downloads API usage. Standard exports now use local Blob download links; Chrome manages download completion. Custom-folder exports use the user-selected File System Access directory. Only activeTab and scripting are required, with optional exact-origin access for supported ChatGPT Deep Research. The replacement was tested for TXT/Markdown exports across all three providers.

The ordinary download path cannot confirm completion or cancel after hand-off; its UI says Download started and directs users to Chrome Downloads. Only a selected-folder write whose stream closes is labelled Export saved. No new required host permissions or backend were added.

Before uploading, verify the ZIP against its adjacent SHA-256 and inventory, or download and verify the immutable GitHub release. These identify the artifact; they do not certify its security. Website deployment and store submission are separate owner-controlled steps.
