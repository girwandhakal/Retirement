import { expect, test } from "@playwright/test";

test("home page loads the planner shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /see if your retirement plan is on track/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /save to browser/i }),
  ).toBeVisible();
});
