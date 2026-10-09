import { expect, test } from "@playwright/test";

test("should be able to click create course button", async ({ page }) => {
  // Navigate to the dashboard (root path)
  await page.goto("/");

  // Get all buttons with the text "新增課程"
  const buttons = page.locator('button:has-text("新增課程")');

  // Wait for at least one button to be visible
  await expect(buttons.first()).toBeVisible({ timeout: 10000 });

  // Get button count
  const buttonCount = await buttons.count();
  console.log(`Found ${buttonCount} buttons with text "新增課程"`);

  // Click the second button (index 1) which should be the one with the add_circle icon
  await buttons.nth(1).click({ timeout: 10000 });

  // Wait for modal to appear
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 10000 });

  console.log("Modal is visible");
});
