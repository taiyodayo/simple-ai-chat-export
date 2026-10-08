import { test, expect } from "@playwright/test";

test("support page is honest about production status, licence and store availability", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/simple-ai-chat-export");
  await expect(
    page.getByRole("heading", {
      name: "A good conversation. A copy of your own.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Production release.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.getByRole("link", { name: /Buy me a coffee/ }).count(),
  ).toBe(2);
  await page.getByText("How do I install it?", { exact: true }).click();
  await expect(
    page.getByText("No store listing is live yet.", { exact: false }),
  ).toBeVisible();
  expect(
    requests.every((url) => url.startsWith(new URL(page.url()).origin + "/")),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Privacy, plainly." }),
  ).toBeVisible();
});
