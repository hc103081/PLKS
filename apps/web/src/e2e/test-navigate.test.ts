import { expect, test } from "@playwright/test";

test("should navigate to homepage", async ({ page }) => {
  console.log("Base URL:", (page.context() as any)._options.baseURL);
  await page.goto("/");
  expect(page.url()).toBe("http://localhost:5173/");
});
