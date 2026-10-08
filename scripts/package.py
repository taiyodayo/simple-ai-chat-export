"""Build the extension from a clean Git commit using the standard ZIP writer."""

import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parent.parent


def git(*args):
    return subprocess.check_output(
        ["git", "-C", str(root), *args], stderr=subprocess.DEVNULL
    )


try:
    commit = git("rev-parse", "--verify", "HEAD^{commit}").decode().strip()
    dirty = git("status", "--porcelain").strip()
except (FileNotFoundError, subprocess.CalledProcessError):
    sys.exit("Packaging requires a Git checkout with committed source.")
if dirty:
    sys.exit("Packaging requires a clean Git checkout. Commit source changes first.")

project = json.loads(git("show", f"{commit}:package.json"))
manifest = json.loads(git("show", f"{commit}:extension/manifest.json"))
version = project["version"]
if (
    manifest["version"] != version.split("-", 1)[0]
    or manifest.get("version_name", manifest["version"]) != version
):
    sys.exit("Package and extension release versions must match.")

files = [
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
]
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w") as archive:
    for name in files:
        source = name if name == "LICENSE" else f"extension/{name}"
        # ZipInfo uses a fixed 1980 timestamp; no local paths or timestamps leak.
        archive.writestr(zipfile.ZipInfo(name), git("show", f"{commit}:{source}"))
data = buffer.getvalue()
sha256 = hashlib.sha256(data).hexdigest()
artifact = f"{project['name']}-{version}.zip"
dist = root / "dist"
dist.mkdir(exist_ok=True)
(dist / artifact).write_bytes(data)
(dist / f"{artifact}.sha256").write_text(f"{sha256}  {artifact}\n")
(dist / "inventory.json").write_text(
    json.dumps(
        {
            "kind": "production release; Chrome Web Store approval tracked separately",
            "license": "MIT + Commons Clause v1.0",
            "artifact": artifact,
            "version": version,
            "commit": commit,
            "dirty": False,
            "sha256": sha256,
            "files": files,
        },
        indent=2,
    )
    + "\n"
)
print(f"Packaged {len(files)} committed files. SHA-256 {sha256}. Source {commit}.")
