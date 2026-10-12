import { test, expect } from "@playwright/test";

test("support page is honest about production status, licence and store availability", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/simple-ai-chat-export");
  await expect(
    page.getByRole("heading", {
      name: "Your conversation, yours to keep.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Production release.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.getByRole("link", { name: /Buy me a coffee/ }).count(),
  ).toBe(2);
  const store =
    "https://chromewebstore.google.com/detail/simple-ai-chat-export-for/hnolfghceldfcghkcfnfafainiiodkhl";
  const install = page.getByRole("link", { name: "Install ↗", exact: true });
  await expect(install).toHaveAttribute("href", store);
  await expect(install).toHaveAttribute("target", "_blank");
  await expect(page.locator("#install")).toHaveAttribute("open", "");
  await expect(
    page.locator("#install").getByRole("link", { name: "Chrome Web Store" }),
  ).toHaveAttribute("href", store);
  await expect(
    page.getByText("Store installations update automatically.", {
      exact: false,
    }),
  ).toBeVisible();
  const allowed = [
    new URL(page.url()).origin + "/",
    "https://static.cloudflareinsights.com/",
    "https://cloudflareinsights.com/",
  ];
  expect(
    requests.every((url) => allowed.some((prefix) => url.startsWith(prefix))),
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
