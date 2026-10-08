# Privacy

Applies to private prototype 0.1.0. Updated 8 October 2026.

Simple ChatGPT Export is an independent project by @taiyodayo. The extension reads rendered messages from the selected ChatGPT tab after you choose Export. It makes no API requests and does not access authentication tokens. The browser preview uses synthetic conversations.

Formatting and file creation run on your device. There is no analytics, advertising, error upload, developer backend, remote configuration or retained conversation cache. The extension does not use localStorage, IndexedDB or Chrome extension storage. Temporary data is released after use; JavaScript memory cannot be guaranteed securely erased.

Your saved files and the browser’s download history remain under your control. The exported text file is not encrypted. Its metadata header includes a conversation URL and message identifiers, which may be sensitive even though they do not grant someone your ChatGPT session. Deleting the extension does not delete your downloaded files.

The `downloads` permission permits more than this extension needs in practice. The implementation starts the requested export, checks only its download identifier, and cancels it if requested or interrupted. It does not enumerate other downloads.

The fixed Buy Me a Coffee link opens only when you click it. No conversation text, title, identifier, query parameter or referrer is sent by the extension with the link. The destination then receives ordinary web connection information, such as your IP address, and applies its own privacy practices. No payment widget or payment credentials are embedded in the extension. Help in the extension is local.

The public website is hosted by Cloudflare. It has no analytics scripts or remote fonts; automatic beacon injection is prevented for these pages. Cloudflare may process ordinary connection information and maintain hosting/security logs under its own policies. Disabling Worker observability does not eliminate provider network logs. If you choose to contact support, the email provider processes the message and the project owner receives what you send. Do not include private transcripts or credentials.

The `activeTab` and `scripting` permissions allow an isolated script to read the chosen conversation after you click the extension and choose Export. The script briefly scrolls the page and restores its position. ChatGPT itself may load content in response to scrolling; the exporter does not make network requests. No credentials are read.

The extension does not upload your conversation data anywhere. Processing happens in-browser, and the implementation can be checked in the [source code on GitHub](https://github.com/taiyodayo/simple-chatgpt-export). The repository is currently private during security review; it will be publicly inspectable before the extension is released. Conversation data is not sold, used for advertising or used to build profiles. Our use of user data adheres to the Chrome Web Store User Data Policy, including its Limited Use requirements.

Planned contact: `chat-simple-export@ongaku.co.uk` (not yet verified). Public release is blocked until contact works.
