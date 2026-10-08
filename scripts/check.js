import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const ignored = new Set([
  ".git",
  ".wrangler",
  "node_modules",
  "dist",
  "test-results",
  "playwright-report",
]);
const files = [];
async function walk(dir) {
  for (const item of await readdir(resolve(root, dir), {
    withFileTypes: true,
  })) {
    if (ignored.has(item.name)) continue;
    const path = dir ? `${dir}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw new Error(`Unexpected symlink: ${path}`);
    if (item.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk("");
const secrets = [
  /[A-Z0-9._%+-]+@gmail\.com/i,
  /gh[pousr]_[a-zA-Z0-9]{30,}/,
  /github_pat_[a-zA-Z0-9_]{30,}/,
  /sk-[a-zA-Z0-9_-]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
let problems = 0;
for (const file of files) {
  if (/\.png$/.test(file)) continue;
  const content = await readFile(resolve(root, file), "utf8");
  if (secrets.some((pattern) => pattern.test(content))) {
    console.error(`Sensitive-data pattern: ${file} (value withheld)`);
    problems++;
  }
  if (/\.js$/.test(file)) {
    const result = spawnSync(
      process.execPath,
      ["--check", resolve(root, file)],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      console.error(`Syntax error: ${file}`);
      problems++;
    }
  }
  if (file.startsWith("extension/") && /\.(js|html)$/.test(file)) {
    if (
      /\beval\s*\(|new\s+Function\b|\.innerHTML\s*=|localStorage|indexedDB|chrome\.storage|javascript:/i.test(
        content,
      )
    ) {
      console.error(`Disallowed runtime pattern: ${file}`);
      problems++;
    }
  }
}
const manifest = JSON.parse(
  await readFile(resolve(root, "extension/manifest.json"), "utf8"),
);
if (
  JSON.stringify(manifest.permissions) !==
    JSON.stringify(["activeTab", "scripting", "downloads"]) ||
  manifest.host_permissions ||
  JSON.stringify(manifest.optional_host_permissions) !==
    JSON.stringify(["https://*.web-sandbox.oaiusercontent.com/*"]) ||
  manifest.content_scripts ||
  manifest.web_accessible_resources
) {
  console.error("Unexpected manifest access");
  problems++;
}
if (problems) process.exitCode = 1;
else
  console.log(
    `Checked ${files.length} files: JavaScript syntax, runtime patterns, manifest access and common secret patterns. This is a limited automated check, not a security audit.`,
  );
