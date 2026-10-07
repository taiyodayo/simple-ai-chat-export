# Cloudflare hosting

Status: page and policy tested locally. First publication is pending the personal Cloudflare connection's Worker Scripts permission; the initial deployment attempt was denied before uploading the site.

Website: `https://ongaku.co.uk/simple-chatgpt-exporter`. Privacy policy: `https://ongaku.co.uk/simple-chatgpt-exporter/privacy`. The owner authorised publishing this pre-release website separately from the extension. Keep the development notice until the extension's release gate passes.

Before deployment, verify the personal account's access to the zone, inspect existing Workers routes and hosting, and confirm that the narrow path does not conflict. Preserve the rest of the website and all existing DNS/mail records. `wrangler.jsonc` routes only the exporter path prefix; the worker serves only its exact known paths. There is no workers.dev deployment or catch-all domain route. Review current Cloudflare configuration support before use.

Use the named Wrangler profile `taiyodayo-personal`, bound locally to this repository. Authentication stays outside Git; the default work profile must not be used. Required OAuth scopes are `user:read`, `account:read`, `zone:read`, `workers:write`, `workers_scripts:write` and `workers_routes:write`. The Chrome Web Store publishing account is separate and must not be used to select Cloudflare infrastructure.

Validated with Wrangler 4.148.0. Run `pnpm dlx --allow-build esbuild --allow-build workerd wrangler@4.148.0 whoami` to verify the active identity, then `pnpm dlx --allow-build esbuild --allow-build workerd wrangler@4.148.0 deploy --config deployment/wrangler.jsonc`. Use `--dry-run` to check the upload first. Assets use `html_handling: none` so internal HTML requests do not redirect visitors away from the project path.

Check the website, privacy URL, CSS and security headers over HTTPS after deployment, and verify the original homepage and `/seatdesigner` route remain intact. Do not upload the repository: only the three static files in `site/` and the Worker handler are published. Worker observability is disabled, but Cloudflare can still process network information to serve and protect the site, as disclosed in the privacy policy.

Email setup: create `chat-simple-export@ongaku.co.uk` as a receive-only forwarding alias only after the owner confirms the destination. Cloudflare Email Routing needs a verified destination and suitable mail DNS; never replace existing MX records without first determining whether that would interrupt the domain's current email. Keep destination addresses and API credentials outside Git. Do not configure a catch-all. Verify inbound delivery before listing the address as active.

A receive-only alias does not supply an outbound sender. Arrange an approved public reply identity before responding to support requests; replying from the private destination could expose it. No verification/test email has been sent by this task.

Extension publication still requires verified behaviour, final retrieval/privacy documentation, licence terms, working support and the owner's launch confirmation. Replace the development notice and add a real store URL only after those conditions are met. Publishing this website does not authorise releasing the extension or making its GitHub repository public.
