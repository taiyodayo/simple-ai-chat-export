# Domain setup — not deployed

Prepared for `https://ongaku.co.uk/simple-chatgpt-exporter`. The existing local Cloudflare session could not see the zone; no infrastructure changes were made. This is a pre-release draft, not a live support service.

Before deployment, verify the personal account's access to the zone, inspect existing Workers routes and hosting, and confirm that the narrow path does not conflict. Preserve the rest of the website and all existing DNS/mail records. `wrangler.jsonc` routes only the exporter path prefix; the worker serves only its exact known paths. There is no workers.dev deployment or catch-all domain route. Review current Cloudflare configuration support before use.

Email setup: create `chat-simple-export@ongaku.co.uk` as a receive-only forwarding alias only after the owner confirms the destination. Cloudflare Email Routing needs a verified destination and suitable mail DNS; never replace existing MX records without first determining whether that would interrupt the domain's current email. Keep destination addresses and API credentials outside Git. Do not configure a catch-all. Verify inbound delivery before listing the address as active.

A receive-only alias does not supply an outbound sender. Arrange an approved public reply identity before responding to support requests; replying from the private destination could expose it. No verification/test email has been sent by this task.

Publication also requires verified extension behaviour, final privacy copy, licence terms, working support and the owner's launch confirmation. Replace the development notice and add a real store URL only after those conditions are met. Do not claim hosting has no logs merely because Worker observability is disabled; review account/provider logging and retention.
