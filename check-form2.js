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
      // 檢查 Google 按鈕
      const buttons = Array.from(document.querySelectorAll('button'));
      const googleButton = buttons.find(b => b.textContent?.includes('使用 Google 帳號登入'));
      
      // 檢查分隔線
      const allText = document.body.innerText;
      const dividerMatch = allText.match(/或繼續使用電子郵件/);
      
      // 檢查 email 輸入框
      const emailInput = document.querySelector('input[type="email"]');
      
      // 檢查提交按鈕
      const submitButtons = Array.from(document.querySelectorAll('button[type="submit"]'));
      const submitButton = submitButtons.find(b => b.textContent?.includes('發送魔術鏈接'));
      
      // 檢查 email 標籤
      const label = document.querySelector('label[for="academic-email"]');
      
      return {
        googleButton: !!googleButton,
        googleButtonText: googleButton?.textContent?.trim(),
        dividerExists: !!dividerMatch,
        emailInput: !!emailInput,
        emailPlaceholder: emailInput?.placeholder,
        submitButton: !!submitButton,
        submitButtonText: submitButton?.textContent?.trim(),
        labelText: label?.textContent?.trim(),
      };
    });
    
    console.log('元素檢查結果:');
    console.log(`  Google 登入按鈕: ${checks.googleButton ? '✅' : '❌'}`);
    if (checks.googleButtonText) console.log(`    文字: "${checks.googleButtonText}"`);
    console.log(`  分隔線 "或繼續使用電子郵件": ${checks.dividerExists ? '✅' : '❌'}`);
    console.log(`  Email 輸入框: ${checks.emailInput ? '✅' : '❌'}`);
    if (checks.emailPlaceholder) console.log(`    Placeholder: "${checks.emailPlaceholder}"`);
    console.log(`  發送魔術鏈接按鈕: ${checks.submitButton ? '✅' : '❌'}`);
    if (checks.submitButtonText) console.log(`    文字: "${checks.submitButtonText}"`);
    console.log(`  標籤文字: "${checks.labelText}"`);
    
  } catch (error) {
    console.error('檢查過程中發生錯誤:', error);
  } finally {
    await browser.close();
  }
})();