import { chromium } from "@playwright/test";
import { homedir } from "node:os";
import { mkdir, realpath } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
const root = resolve(import.meta.dirname, "..");
const profile = resolve(
  homedir(),
  ".local/share/simple-chatgpt-export/live-browser-profile",
);
await mkdir(profile, { recursive: true, mode: 0o700 });
const actualProfile = await realpath(profile),
  actualRoot = await realpath(root);
const difference = relative(actualRoot, actualProfile);
if (!difference || (!difference.startsWith("..") && !isAbsolute(difference)))
  throw new Error("The browser profile must stay outside the repository.");
const context = await chromium.launchPersistentContext(actualProfile, {
  channel: "chromium",
  headless: false,
  args: [
    `--disable-extensions-except=${resolve(root, "extension")}`,
    `--load-extension=${resolve(root, "extension")}`,
  ],
});
const closed = new Promise((resolve) => context.on("close", resolve));
const page = context.pages()[0] ?? (await context.newPage());
await page.goto("https://chatgpt.com");
console.log(
  "Dedicated test browser opened. Sign in manually. Use synthetic conversations; do not share tokens. Close this browser when finished.",
);
await closed;
