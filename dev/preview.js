import { mount } from "/extension/popup.js";
import { fixture, identity } from "/tests/fixtures.js";
import { ExportError } from "/extension/core.js";

document.getElementById("prototype").textContent =
  "Interactive preview · sample conversation";
const controls = document.createElement("aside");
controls.style.cssText =
  "max-width:440px;margin:12px auto;padding:16px;border:1px dashed #9aa798;font:13px system-ui";
controls.innerHTML =
  '<label for="scenario">Preview scenario </label><select id="scenario"><option value="success">Successful export</option><option value="omission">Image omitted</option><option value="long">2,000 messages</option><option value="incomplete">Missing message</option><option value="changed">Branch changes</option><option value="generating">Reply still writing</option><option value="signed-out">Signed out</option><option value="offline">Offline</option><option value="save-interrupted">Cancelled save</option><option value="slow">Slow retrieval</option><option value="unsafe">Untrusted message content</option></select><p>Only synthetic content is used. Save confirmation is simulated; this preview does not write a file.</p>';
document.body.append(controls);
let scenario;
mount({
  selectDirectory: async () => ({ kind: "directory", name: "Chat exports" }),
  retrieve: async ({ signal }) => {
    scenario = document.getElementById("scenario").value;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, scenario === "slow" ? 15000 : 200);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new ExportError("cancelled"));
        },
        { once: true },
      );
    });
    if (["signed-out", "offline"].includes(scenario))
      throw new ExportError(scenario);
    const data = fixture({
      count: scenario === "long" ? 2000 : 2,
      omission: scenario === "omission",
    });
    if (scenario === "incomplete")
      data.nodes = data.nodes.filter((n) => n.id !== "message-1");
    if (scenario === "generating") data.generating = true;
    if (scenario === "unsafe")
      data.nodes[1].parts[0].text =
        '<img src="https://invalid.example/track" onerror="alert(1)"><script>alert(2)</script>';
    return { data, identity: identity(data) };
  },
  confirmUnchanged: async () => {
    if (scenario === "changed") throw new ExportError("changed");
  },
  save: async (_blob, filename, { directoryHandle }) => {
    if (scenario === "save-interrupted")
      throw new ExportError("save-interrupted");
    return {
      status: directoryHandle ? "saved" : "download-started",
      filename,
    };
  },
});
