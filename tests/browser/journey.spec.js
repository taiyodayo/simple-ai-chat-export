import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("welcoming first use, format choice, success and a deliberate coffee click", async ({
  page,
}) => {
  const external = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173"))
      external.push(request.url());
  });
  await expect(
    page.getByRole("heading", { name: "Your conversation. A copy to keep." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Buy me a coffee" }),
  ).toBeHidden();
  await page.getByRole("radio", { name: /Plain text/ }).check();
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await expect(
    page.getByRole("heading", { name: "Export saved." }),
  ).toBeVisible();
  await expect(page.getByText("2 messages. Unzip")).toBeVisible();
  const coffee = page.getByRole("link", { name: "Buy me a coffee" });
  await expect(coffee).toHaveAttribute(
    "href",
    "https://buymeacoffee.com/taiyodayo",
  );
  await expect(coffee).toHaveAttribute("rel", "noopener noreferrer");
  await expect(coffee).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(external).toEqual([]);
  // Intercept before navigation; no payment-provider request during testing.
  await page.context().route("https://buymeacoffee.com/**", (route) => {
    expect(route.request().headers().referer).toBeUndefined();
    return route.fulfill({ body: "<title>Support</title>" });
  });
  const opened = page.waitForEvent("popup");
  await coffee.click();
  const support = await opened;
  await support.waitForLoadState();
  expect(await support.evaluate(() => window.opener)).toBeNull();
});
test("known omissions require a second explicit text-only action", async ({
  page,
}) => {
  await page.getByLabel("Preview scenario").selectOption("omission");
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await expect(
    page.getByRole("heading", { name: "A text-only copy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Buy me a coffee" }),
  ).toBeHidden();
  await page.getByRole("button", { name: /Export text only/ }).click();
  await expect(page.getByText("2 messages · text-only copy.")).toBeVisible();
});
for (const [scenario, heading] of [
  ["incomplete", "We couldn’t confirm the whole conversation"],
  ["changed", "The conversation changed"],
  ["generating", "Let ChatGPT finish first"],
  ["signed-out", "Sign in to ChatGPT"],
  ["offline", "Couldn’t reach ChatGPT"],
  ["save-interrupted", "The file wasn’t saved"],
])
  test(`${scenario} never offers coffee or claims success`, async ({
    page,
  }) => {
    await page.getByLabel("Preview scenario").selectOption(scenario);
    await page.getByRole("button", { name: /Export conversation/ }).click();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buy me a coffee" }),
    ).toBeHidden();
    await expect(
      page.getByRole("button", { name: /Export conversation/ }),
    ).toBeEnabled();
  });
test("cancel stops pending work and permits retry", async ({ page }) => {
  await page.getByLabel("Preview scenario").selectOption("slow");
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Export cancelled" }),
  ).toBeVisible();
  await page.getByLabel("Preview scenario").selectOption("success");
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await expect(
    page.getByRole("heading", { name: "Export saved." }),
  ).toBeVisible();
});
test("long conversation count comes from the validated branch", async ({
  page,
}) => {
  await page.getByLabel("Preview scenario").selectOption("long");
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await expect(page.getByText("2000 messages. Unzip")).toBeVisible();
});
test("success fits the export window and another copy restores the format choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 600 });
  await page.getByRole("button", { name: /Export conversation/ }).click();
  const coffee = page.getByRole("link", { name: "Buy me a coffee" });
  await expect(coffee).toBeInViewport();
  await page.getByRole("button", { name: "Export another copy" }).click();
  await expect(page.getByRole("radio", { name: /Markdown/ })).toBeVisible();
  await expect(coffee).toBeHidden();
});
test("message HTML never enters the interface or triggers requests", async ({
  page,
}) => {
  const dialogs = [],
    requests = [];
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    d.dismiss();
  });
  page.on("request", (r) => requests.push(r.url()));
  await page.getByLabel("Preview scenario").selectOption("unsafe");
  await page.getByRole("button", { name: /Export conversation/ }).click();
  await expect(
    page.getByRole("heading", { name: "Export saved." }),
  ).toBeVisible();
  expect(dialogs).toEqual([]);
  expect(requests.some((r) => r.includes("invalid.example"))).toBe(false);
  expect(await page.locator("main img").count()).toBe(0);
});
test("narrow viewport, keyboard navigation and help remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("radio", { name: /Markdown/ }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Plain text/ })).toBeChecked();
  await page.getByRole("link", { name: "Help & privacy" }).click();
  await expect(
    page.getByRole("heading", { name: "Your privacy" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to export" }).click();
  await expect(
    page.getByRole("button", { name: /Export conversation/ }),
  ).toBeVisible();
});
