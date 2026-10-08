import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function checkout(t) {
  const dir = await mkdtemp(join(tmpdir(), "simple-ai-chat-package-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = new URL("../", import.meta.url);
  for (const name of ["extension", "LICENSE", "package.json"])
    await cp(new URL(name, root), join(dir, name), { recursive: true });
  await mkdir(join(dir, "scripts"));
  await cp(
    new URL("scripts/package.py", root),
    join(dir, "scripts/package.py"),
  );
  await writeFile(join(dir, ".gitignore"), "dist/\n");
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, stdio: "pipe" }).toString().trim();
  git("init", "-q");
  git("config", "user.name", "Synthetic release test");
  git("config", "user.email", "release-test@example.invalid");
  git("add", ".");
  git("commit", "-qm", "Synthetic source");
  const build = () =>
    spawnSync("python3", ["scripts/package.py"], {
      cwd: dir,
      encoding: "utf8",
    });
  return { dir, git, build };
}

test("clean committed builds are reproducible and ZIP bytes match Git source", async (t) => {
  const { dir, git, build } = await checkout(t);
  assert.equal(build().status, 0);
  const inventory = JSON.parse(
    await readFile(join(dir, "dist/inventory.json")),
  );
  assert.equal(inventory.commit, git("rev-parse", "HEAD"));
  assert.equal(inventory.dirty, false);
  const path = join(dir, "dist", inventory.artifact);
  const first = await readFile(path);
  assert.equal(build().status, 0);
  assert.deepEqual(await readFile(path), first);
  execFileSync(
    "python3",
    [
      "-c",
      `import hashlib,json,subprocess,sys,zipfile
from pathlib import Path
root=Path(sys.argv[1])
inventory=json.loads((root/'dist/inventory.json').read_text())
data=(root/'dist'/inventory['artifact']).read_bytes()
assert hashlib.sha256(data).hexdigest()==inventory['sha256']
with zipfile.ZipFile(root/'dist'/inventory['artifact']) as z:
    assert z.testzip() is None
    assert set(z.namelist())==set(inventory['files'])
    assert len(z.namelist())==17
    for name in z.namelist():
        source=name if name=='LICENSE' else 'extension/'+name
        expected=subprocess.check_output(['git','-C',str(root),'show',inventory['commit']+':'+source])
        assert z.read(name)==expected
`,
      dir,
    ],
    { stdio: "pipe" },
  );
});

for (const mode of [
  "tracked edit",
  "untracked file",
  "missing Git",
  "version mismatch",
])
  test(`packaging refuses ${mode} without replacing existing artifacts`, async (t) => {
    const { dir, git, build } = await checkout(t);
    const project = JSON.parse(await readFile(join(dir, "package.json")));
    const artifact = join(
      dir,
      "dist",
      `${project.name}-${project.version}.zip`,
    );
    await mkdir(join(dir, "dist"));
    await writeFile(artifact, "EXISTING ARTIFACT MUST SURVIVE");
    if (mode === "tracked edit")
      await writeFile(join(dir, "extension/popup.html"), "Synthetic edit");
    if (mode === "untracked file")
      await writeFile(
        join(dir, "unexpected.txt"),
        "Synthetic untracked source",
      );
    if (mode === "missing Git")
      await rm(join(dir, ".git"), { recursive: true });
    if (mode === "version mismatch") {
      const path = join(dir, "extension/manifest.json");
      const manifest = JSON.parse(await readFile(path));
      manifest.version = "99.0.0";
      await writeFile(path, JSON.stringify(manifest));
      git("add", ".");
      git("commit", "-qm", "Synthetic mismatched version");
    }
    const result = build();
    assert.notEqual(result.status, 0);
    assert.ok(
      result.stderr.includes(
        mode === "missing Git"
          ? "Git checkout with committed source"
          : mode === "version mismatch"
            ? "versions must match"
            : "clean Git checkout",
      ),
    );
    assert.equal(
      await readFile(artifact, "utf8"),
      "EXISTING ARTIFACT MUST SURVIVE",
    );
  });
