# Owner decisions

- Primary task: quick local archiving and editing for ChatGPT, Claude and Gemini users.
- Simple, elegant, welcoming interface. British English with restrained charm; factual errors and privacy copy.
- Target macOS, Windows, Linux and Chromium browsers. Claim support only after testing.
- Export the conversation/branch being displayed. Metadata belongs at the beginning of the exported TXT or Markdown file. No ZIP or companion metadata file.
- Prototype first, then owner-provided manually signed-in test profile. No public release before working confirmation.
- Guest conversations must export too; signing in is not an export requirement. Verify both guest and signed-in conversations before release.
- Personal GitHub `taiyodayo/simple-ai-chat-export`, private during development. Commit identity `taiyodayo`, GitHub no-reply email only.
- Never publish the owner's private Gmail or forwarding destination. Public support identity planned at `chat-simple-export@ongaku.co.uk`; support page at `https://ongaku.co.uk/simple-ai-chat-export`.
- Chrome Web Store must use the owner's dedicated app-publishing account, supplied privately in the conversation. It is distinct from the personal Cloudflare account that owns the domain. Do not put either login email in public files.
- Coffee: visible on GitHub, support page and store listing; in the extension only after confirmed success. Fixed URL: `https://buymeacoffee.com/taiyodayo`.
- Owner requires attribution to @taiyodayo. Exact visible-credit/copyleft preference is pending. MIT is not assumed.
- Cloudflare: personal identity and access to `ongaku.co.uk` are verified through the separate `taiyodayo-personal` Wrangler profile. The owner has authorised publishing the pre-release website. Deployment completed after refreshed consent. The website and dedicated privacy policy are live; the extension and GitHub repository remain private. No DNS or email changes have been made.

Pending owner inputs: attribution/licence choice; forwarding-alias destination confirmation.

- One Export click starts the download. No extra text-only confirmation or forced Save As dialog. Mark omitted non-text content in the exported file.

- On 8 October 2026 the owner authorised PR/merge of the ChatGPT baseline and a private prerelease before adding providers. PR #2 is merged and `v0.1.1-beta.1` is published.
- Repository/app identifier: `simple-ai-chat-export`. Marketing name: **Simple AI-Chat export for ChatGPT, Claude, Gemini**. Keep one shared UI and avoid extra settings or a provider framework.
- Update README and public support/privacy pages. Retain the old website paths as aliases. Ordinary provider access continues to use `activeTab`, with no extra required host permissions.
