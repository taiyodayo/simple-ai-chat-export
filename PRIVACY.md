# Privacy

Applies to private prototype 0.1.0. Updated 7 October 2026.

Simple Chat Export is an independent project by @taiyodayo. The prototype checks the selected tab’s address after you open the extension, but does not retrieve live ChatGPT messages. The browser preview uses synthetic conversations.

Formatting and archive creation run on your device. There is no analytics, advertising, error upload, developer backend, remote configuration or retained conversation cache. The extension does not use localStorage, IndexedDB or Chrome extension storage. Temporary data is released after use; JavaScript memory cannot be guaranteed securely erased.

Your saved files and the browser’s download history remain under your control. The ZIP is not encrypted. Its metadata includes a conversation URL and message identifiers, which may be sensitive even though they do not grant someone your ChatGPT session. Deleting the extension does not delete your downloaded files.

The `downloads` permission permits more than this extension needs in practice. The implementation starts the requested export, checks only its download identifier, and cancels it if requested or interrupted. It does not enumerate other downloads.

The fixed Buy Me a Coffee link opens only when you click it. No conversation text, title, identifier, query parameter or referrer is sent by the extension with the link. The destination then receives ordinary web connection information, such as your IP address, and applies its own privacy practices. No payment widget or payment credentials are embedded in the extension. Help in the extension is local.

The planned public website may generate ordinary hosting/security logs at its hosting provider. Hosting configuration and retention must be reviewed before deployment; do not claim the website has no logs. If you choose to contact support, the email provider processes the message and the project owner receives what you send. Do not include private transcripts or credentials.

Before live export is enabled, this policy must be updated to describe the observed ChatGPT retrieval method and any transient authentication handling. Conversation processing must remain local; only ChatGPT may be contacted to retrieve the current conversation.

Planned contact: `chat-simple-export@ongaku.co.uk` (not yet verified). Public release is blocked until contact works.
