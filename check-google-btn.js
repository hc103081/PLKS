const { chromium } = require('playwright');

(async () => {
  console.log('檢查登入頁面 Google 登入按鈕...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // 檢查 Google 登入按鈕是否存在
    const googleButton = await page.$('button:has-text("使用 Google 帳號登入")');
    console.log(`Google 登入按鈕: ${googleButton ? '✅ 存在' : '❌ 不存在'}`);
    
    // 檢查分隔線文字
    const dividerText = await page.$eval('text=或繼續使用電子郵件', el => el.textContent);
    console.log(`分隔線文字: ${dividerText}`);
    
    // 檢查魔術鏈接表單是否存在
    const magicLinkForm = await page.$('text=魔術鏈接登入');
    console.log(`魔術鏈接表單: ${magicLinkForm ? '✅ 存在' : '❌ 不存在'}`);
    
    // 截圖
    await page.screenshot({ path: 'login-with-google.png', fullPage: true });
    console.log('\n截圖已儲存: login-with-google.png');
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole 錯誤:');
      consoleErrors.forEach((e, i) => console.log(`  ${i+1}: ${e}`));
    } else {
      console.log('\n✅ 無 Console 錯誤');
    }
    
  } catch (error) {
    console.error('檢查過程中發生錯誤:', error);
  } finally {
    await browser.close();
  }
})();