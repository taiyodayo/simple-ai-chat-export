import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PREVIEW_PORT ?? "4183";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: {
    baseURL,
    viewport: { width: 440, height: 800 },
    trace: "off",
  },
  webServer: {
    command: "node scripts/preview.js",
    url: baseURL,
    env: { PREVIEW_PORT: port },
    reuseExistingServer: false,
  },
  reporter: "list",
});
