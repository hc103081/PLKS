# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\e2e\test-button-click.test.ts >> should be able to click create course button
- Location: src\e2e\test-button-click.test.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('should be able to click create course button', async ({ page }) => {
  4  |   // Navigate to the dashboard (root path)
> 5  |   await page.goto('/');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  |   
  7  |   // Get all buttons with the text "新增課程"
  8  |   const buttons = page.locator('button:has-text("新增課程")');
  9  |   
  10 |   // Wait for at least one button to be visible
  11 |   await expect(buttons.first()).toBeVisible({ timeout: 10000 });
  12 |   
  13 |   // Get button count
  14 |   const buttonCount = await buttons.count();
  15 |   console.log(`Found ${buttonCount} buttons with text "新增課程"`);
  16 |   
  17 |   // Click the second button (index 1) which should be the one with the add_circle icon
  18 |   await buttons.nth(1).click({ timeout: 10000 });
  19 |   
  20 |   // Wait for modal to appear
  21 |   const modal = page.locator('[role="dialog"]');
  22 |   await expect(modal).toBeVisible({ timeout: 10000 });
  23 |   
  24 |   console.log('Modal is visible');
  25 | });
```