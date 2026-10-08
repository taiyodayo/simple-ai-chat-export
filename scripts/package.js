import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { archiveBytes } from "./archive.js";

const root = new URL("../", import.meta.url);
const project = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);
const inventory = [
  "LICENSE",
  "core.js",
  "help.html",
  "help.js",
  "icon-16.png",
  "icon-32.png",
  "icon-48.png",
  "icon-128.png",
  "launch.js",
  "manifest.json",
  "popup.css",
  "popup.html",
  "popup.js",
  "retrieval.js",
  "research.js",
  "page-reader.js",
  "save.js",
];
const entries = await Promise.all(
  inventory.map(async (name) => [
    name,
    new Uint8Array(
      await readFile(
        new URL(name === "LICENSE" ? "LICENSE" : `extension/${name}`, root),
      ),
    ),
  ]),
);
const zip = archiveBytes(entries);
const sha256 = createHash("sha256").update(zip).digest("hex");
let commit = "uncommitted";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}
const dirty =
  execFileSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  }).trim().length > 0;
await mkdir(new URL("dist/", root), { recursive: true });
const name = `${project.name}-${project.version}.zip`;
await writeFile(new URL(`dist/${name}`, root), zip);
await writeFile(new URL(`dist/${name}.sha256`, root), `${sha256}  ${name}\n`);
await writeFile(
  new URL("dist/inventory.json", root),
  JSON.stringify(
    {
      kind: "production release; Chrome Web Store approval tracked separately",
      license: "MIT + Commons Clause v1.0",
      artifact: name,
      version: project.version,
      commit,
      dirty,
      sha256,
      files: inventory,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Packaged ${inventory.length} files. SHA-256 ${sha256}. Source ${commit}${dirty ? " (working tree has changes)" : ""}. Chrome Web Store submission package.`,
);
