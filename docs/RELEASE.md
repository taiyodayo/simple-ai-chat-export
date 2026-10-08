# Release checklist

Public release is blocked until the owner confirms working behaviour and the following checks are complete. The repository must remain private during development.

- [x] Record and implement the rendered-page reader; provider alpha adds Claude and Gemini to the existing ChatGPT pipeline.
- [ ] Verify long selected branches, edited prompts, regenerated replies, navigation and pagination against synthetic chats in a manually signed-in profile.
- [ ] Verify allowed traffic: reading only the requested conversation from the selected supported chat app; no unrelated chats, image downloads or third-party processing.
- [ ] Inspect console output, storage and packaged files for chat content or authentication data.
- [ ] Exercise real save, cancel, permission rejection, window closure and retry on Chrome for macOS, Windows and Linux. Record exact versions. Test Edge/Brave before naming them as supported.
- [ ] Perform a security review of code, dependencies, Git history and the final ZIP. Built-in pattern scanning is only a first-pass check, not a complete audit.
- [ ] Confirm the owner's licence and visible-attribution requirements. Add the chosen licence verbatim and corresponding notices; do not label a custom licence MIT.
- [ ] Activate and verify receive-only support email; preserve existing domain mail settings. Establish a way to reply from a public identity without exposing private Gmail.
- [ ] Publish and verify the renamed website/privacy pages and new `/simple-ai-chat-export` paths after restoring personal Cloudflare authentication.
- [x] Deploy and verify the original pre-release website at `https://ongaku.co.uk/simple-chatgpt-exporter` and policy at `/simple-chatgpt-exporter/privacy`. Existing homepage and routes preserved; email contact remains a separate gate.
- [ ] Change prototype-only UI/copy only when evidence supports the resulting claims. Install screenshots must show the real verified product.
- [ ] Confirm the owner's dedicated app-publishing Chrome Web Store identity, supplied privately. Do not use the Cloudflare login or employer account. Complete data-use disclosures and accurate permission justifications. Review current donation-link and branding policy; listing URLs may be plain text.
- [ ] Obtain owner's working confirmation before public launch. Change the GitHub repository to public only after the security/history review.
- [ ] Commit the final source, tag it, package that clean tag, inspect its inventory and test the extracted ZIP. Publish commit, inventory and SHA-256 alongside the release. Checksums establish identity, not safety.
- [ ] Add the actual store URL to the support page and README. Never present an invented install link.

Do not include development fixtures, browser profiles, traces, screenshots, network dumps, environment files or private contact destinations in the package. Support contributions are optional and never unlock functionality.
