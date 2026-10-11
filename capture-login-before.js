const { chromium } = require('playwright');

(async () => {
  console.log('捕獲修復前的登入頁面截圖...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 導航到本地開發伺服器的登入頁面
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // 等待頁面完全載入
    await page.waitForTimeout(3000);
    
    // 截圖 - 完整頁面
    await page.screenshot({ path: 'login-before-full.png', fullPage: true });
    console.log('完整頁面截圖已儲存: login-before-full.png');
    
    // 截圖 - 視窗範圍
    await page.screenshot({ path: 'login-before-viewport.png', fullPage: false });
    console.log('視窗範圍截圖已儲存: login-before-viewport.png');
    
    // 獲取主要元素的位置資訊
    const mainElement = await page.$('main');
    if (mainElement) {
      const box = await mainElement.boundingBox();
      console.log('\nMain 元素位置資訊:');
      console.log(`  x: ${box?.x}, y: ${box?.y}`);
      console.log(`  width: ${box?.width}, height: ${box?.height}`);
      
      // 檢查外層容器
      const outerContainer = await page.$('div.min-h-screen');
      if (outerContainer) {
        const outerBox = await outerContainer.boundingBox();
        console.log('\n外層容器位置資訊:');
        console.log(`  x: ${outerBox?.x}, y: ${outerBox?.y}`);
        console.log(`  width: ${outerBox?.width}, height: ${outerBox?.height}`);
      }
    }
    
  } catch (error) {
    console.error('截圖過程中發生錯誤:', error);
  } finally {
    await browser.close();
    console.log('\n截圖完成');
  }
})();