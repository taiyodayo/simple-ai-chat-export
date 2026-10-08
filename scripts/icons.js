import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    const data = await page.evaluate((size) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const c = canvas.getContext("2d");
      c.scale(size / 128, size / 128);
      c.translate(16, 16);
      c.scale(0.75, 0.75);
      c.fillStyle = "#284e3a";
      c.beginPath();
      c.roundRect(0, 0, 128, 128, 28);
      c.fill();
      c.strokeStyle = "#faf9f5";
      c.lineWidth = 9;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(64, 29);
      c.lineTo(64, 78);
      c.moveTo(44, 60);
      c.lineTo(64, 80);
      c.lineTo(84, 60);
      c.stroke();
      c.beginPath();
      c.moveTo(34, 88);
      c.lineTo(34, 99);
      c.lineTo(94, 99);
      c.lineTo(94, 88);
      c.stroke();
      return canvas.toDataURL("image/png").split(",")[1];
    }, size);
    await writeFile(
      new URL(`../extension/icon-${size}.png`, import.meta.url),
      Buffer.from(data, "base64"),
    );
  }
} finally {
  await browser.close();
}
