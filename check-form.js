const { chromium } = require('playwright');

(async () => {
  console.log('詳細檢查登入頁面元素...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // 檢查各種元素
    const checks = await page.evaluate(() => {
      return {
        googleButton: !!document.querySelector('button:has-text("使用 Google 帳號登入")'),
        dividerText: document.querySelector('text=或繼續使用電子郵件')?.textContent,
        emailInput: !!document.querySelector('input[type="email"]'),
        submitButton: !!document.querySelector('button[type="submit"]:has-text("發送魔術鏈接")'),
        magicLinkLabel: document.querySelector('label[for="academic-email"]')?.textContent,
        errorDiv: !!document.querySelector('[class*="bg-error"]'),
      };
    });
    
    console.log('元素檢查結果:');
    console.log(`  Google 登入按鈕: ${checks.googleButton ? '✅' : '❌'}`);
    console.log(`  分隔線文字: "${checks.dividerText}"`);
    console.log(`  Email 輸入框: ${checks.emailInput ? '✅' : '❌'}`);
    console.log(`  發送魔術鏈接按鈕: ${checks.submitButton ? '✅' : '❌'}`);
    console.log(`  Email 標籤: "${checks.magicLinkLabel}"`);
    console.log(`  錯誤顯示區: ${checks.errorDiv ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('檢查過程中發生錯誤:', error);
  } finally {
    await browser.close();
  }
})();