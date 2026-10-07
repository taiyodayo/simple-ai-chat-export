// Isolated path only; do not replace the existing domain's site or DNS.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const paths = new Map([
      ["/simple-chatgpt-exporter", "/index.html"],
      ["/simple-chatgpt-exporter/", "/index.html"],
      ["/simple-chatgpt-exporter/styles.css", "/styles.css"],
      ["/simple-chatgpt-exporter/privacy", "/privacy.html"],
      ["/simple-chatgpt-exporter/privacy/", "/privacy.html"],
    ]);
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    const target = paths.get(url.pathname);
    if (!target) return new Response("Not found", { status: 404 });
    url.pathname = target;
    url.search = "";
    const asset = await env.ASSETS.fetch(
      new Request(url, { method: request.method }),
    );
    const response = new Response(asset.body, asset);
    // Prevent Cloudflare from adding its automatic analytics beacon here.
    // This applies only to this Worker's responses, not the rest of the domain.
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, must-revalidate, no-transform",
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    response.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    return response;
  },
};
