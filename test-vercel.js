const { chromium } = require('playwright');

(async () => {
  console.log('開始測試 Vercel 部署: https://plks.vercel.app/');
  
  // 啟動瀏覽器
  const browser = await chromium.launch({ headless: true }); // 使用無頭模式以加快速度
  const page = await browser.newPage();
  
  try {
    // 監控 Console 訊息
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 監控失敗的網路請求
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    // 導航到網站
    console.log('導航到網站...');
    await page.goto('https://plks.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000 // 增加超時時間以確保有足夠時間載入
    });
    
    // 等待一段時間確保 JS 執行完成
    await page.waitForTimeout(5000);
    
    // 獲取頁面標題
    const title = await page.title();
    console.log(`頁面標題: "${title}"`);
    
    // 檢查根元素
    const rootElement = await page.$('#root');
    if (rootElement) {
      const rootInnerHTML = await rootElement.innerHTML();
      console.log(`#root 元素內容長度: ${rootInnerHTML.length} 個字元`);
      console.log(`#root 元素內容預覽: "${rootInnerHTML.substring(0, 200)}${rootInnerHTML.length > 200 ? '...' : ''}"`);
      
      // 檢查是否有子元素（React 是否已掛載）
      const childCount = await rootElement.evaluate(el => el.children.length);
      console.log(`#root 元素子元素數量: ${childCount}`);
    } else {
      console.log('#root 元素不存在!');
    }
    
    // 檢查 body 類別（基於您提供的 HTML 片段）
    const bodyElement = await page.$('body');
    if (bodyElement) {
      const bodyClass = await bodyElement.getAttribute('class');
      console.log(`body 元素 class: "${bodyClass}"`);
    }
    
    // 報告 Console 錯誤
    if (consoleErrors.length > 0) {
      console.log('\n發現 Console 錯誤:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}: ${error}`);
      });
    } else {
      console.log('\n未發現 Console 錯誤');
    }
    
    // 報告 Network 錯誤
    if (failedRequests.length > 0) {
      console.log('\n發生 Network 錯誤:');
      failedRequests.forEach((req, index) => {
        console.log(`  ${index + 1}: ${req.url}`);
        console.log(`      錯誤: ${req.failure?.errorText || '未知錯誤'}`);
      });
    } else {
      console.log('\n未發現 Network 錯誤');
    }
    
    // 截圖
    await page.screenshot({ path: 'vercel-deploy-screenshot.png', fullPage: true });
    console.log('\n截圖已儲存為 vercel-deploy-screenshot.png');
    
    // 獲取頁面內容以便進一步分析
    const pageContent = await page.content();
    console.log(`\n頁面完整 HTML 長度: ${pageContent.length} 個字元`);
    
  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    await browser.close();
    console.log('\n測試完成，瀏覽器已關閉');
  }
})();