// apps/web/src/e2e/complete-flow.test.ts
import { expect, test } from "@playwright/test";

test.describe("Complete User Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
  });

  test("should complete full flow: login -> create course -> start game -> take quiz -> use sidekick -> export", async ({
    page,
  }) => {
    test.setTimeout(120000);

    // 1. Login with Magic Link
    await test.step("Login with Magic Link", async () => {
      await page.fill('input[type="email"]', "test@university.edu.tw");
      await page.click('button:has-text("發送魔術鏈接")');
      await expect(page.locator("text=魔術鏈接已發送")).toBeVisible({ timeout: 10000 });
      // In real test, we'd check email and click link
      // For E2E test, we simulate successful auth by navigating to dashboard
      await page.goto("/");
    });

    // 2. Create Course
    await test.step("Create Course", async () => {
      await page.waitForLoadState("networkidle");
      await page.waitForSelector("text=載入中...", { state: "hidden", timeout: 15000 });

      const buttons = page.locator('button:has-text("新增課程")');
      await expect(buttons.first()).toBeVisible({ timeout: 10000 });
      await buttons.nth(1).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });

      await page.fill('input[placeholder="例如：2692"]', "E2ETEST101");
      await page.fill('input[placeholder="例如：CS101 計算機概論與系統架構"]', "E2E Test Course");
      await page.selectOption('select[name="semester"]', "104-1");
      await page.click('button:has-text("建立課程並啟動管線")');

      await expect(modal).not.toBeVisible({ timeout: 10000 });
      await page.waitForSelector("text=載入中...", { state: "hidden", timeout: 15000 });

      await expect(page.locator("text=E2E Test Course")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=E2ETEST101")).toBeVisible({ timeout: 10000 });
    });

    // 3. Start Game Session
    await test.step("Start Game Session", async () => {
      // Click "開始學習" on the newly created course
      await page.click('button:has-text("開始學習")');
      await page.waitForLoadState("networkidle");
      await page.waitForURL(/\/course\/.*tab=raw/, { timeout: 15000 });

      // Should be on CoursePage with raw tab
      await expect(page.locator('h1:has-text("E2E Test Course")')).toBeVisible({ timeout: 10000 });
    });

    // 4. Navigate to Game Tab
    await test.step("Navigate to Game Tab", async () => {
      await page.click('button[role="tab"]:has-text("測驗")');
      await page.waitForLoadState("networkidle");

      // Wait for game to load
      await expect(page.locator('text="歡迎來到小幫手！"')).toBeVisible({ timeout: 15000 });
    });

    // 5. Take Quiz
    await test.step("Take Quiz", async () => {
      // Check if quiz question is displayed
      const quizQuestion = page.locator('[data-testid="quiz-question"]').first();
      if (await quizQuestion.isVisible({ timeout: 5000 })) {
        // Answer the quiz
        await page.fill('textarea[placeholder*="答案"]', "測試答案");
        await page.click('button:has-text("提交答案")');
        await page.waitForTimeout(2000);

        // Should show feedback
        await expect(page.locator("text=/正確|錯誤/")).toBeVisible({ timeout: 5000 });
      }
    });

    // 6. Use Sidekick
    await test.step("Use Sidekick", async () => {
      // Click Sidekick button
      await page.click('button:has-text("小幫手")');
      await page.waitForTimeout(1000);

      // Sidekick sidebar should open
      await expect(page.locator('text="小幫手聊天"')).toBeVisible({ timeout: 5000 });

      // Send a message to Sidekick
      await page.fill('textarea[placeholder*="詢問小幫手"]', "請解釋這個概念");
      await page.click('button:has-text("發送")');
      await page.waitForTimeout(2000);

      // Should show response
      await expect(page.locator(".bg-white.rounded-2xl").last()).toBeVisible({ timeout: 5000 });
    });

    // 7. Export to Obsidian
    await test.step("Export to Obsidian", async () => {
      // Go back to course header and click export
      await page.click('button:has-text("導出 Obsidian")');
      await page.waitForTimeout(2000);

      // Should show loading state then success
      await expect(page.locator("text=/導出中|導出成功|匯出完成/")).toBeVisible({ timeout: 10000 });
    });
  });

  test("should handle course dashboard navigation", async ({ page }) => {
    // Simulate authenticated state
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("text=載入中...", { state: "hidden", timeout: 15000 });

    // Verify dashboard elements
    await expect(page.locator("text=學術學習與知識總覽")).toBeVisible();
    await expect(page.locator('button:has-text("新增課程")')).toBeVisible();

    // Check semester tabs
    await expect(page.locator('button:has-text("104-1")')).toBeVisible();
  });

  test("should navigate between course tabs", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("text=載入中...", { state: "hidden", timeout: 15000 });

    // Create a test course first
    const buttons = page.locator('button:has-text("新增課程")');
    await buttons.nth(1).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await page.fill('input[placeholder="例如：2692"]', "NAVTEST101");
    await page.fill(
      'input[placeholder="例如：CS101 計算機概論與系統架構"]',
      "Navigation Test Course",
    );
    await page.selectOption('select[name="semester"]', "104-1");
    await page.click('button:has-text("建立課程並啟動管線")');
    await expect(modal).not.toBeVisible();
    await page.waitForSelector("text=載入中...", { state: "hidden", timeout: 15000 });

    // Navigate to course
    await page.click('button:has-text("開始學習")');
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/course\/.*tab=raw/);

    // Test tab navigation
    const tabs = ["大綱", "測驗", "管線", "原始檔"];
    for (const tab of tabs) {
      await page.click(`button[role="tab"]:has-text("${tab}")`);
      await page.waitForTimeout(500);
      // Each tab should load without error
      await expect(page.locator(".main-content")).toBeVisible();
    }
  });
});
