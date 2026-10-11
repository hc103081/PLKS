const { chromium } = require('playwright');

(async () => {
  console.log('捕獲所有 Console 訊息以診斷問題');
  
  // 啟動瀏覽器
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 捕獲所有類型的 Console 訊息
    const consoleMessages = {
      log: [],
      info: [],
      warn: [],
      error: [],
      debug: []
    };
    
    page.on('console', msg => {
      const type = msg.type();
      if (consoleMessages[type] !== undefined) {
        consoleMessages[type].push(msg.text());
      }
    });
    
    // 也捕獲頁面異常
    page.on('pageerror', error => {
      consoleMessages.error.push(`Page error: ${error}`);
    });
    
    // 導航到網站
    console.log('導航到網站...');
    await page.goto('https://plks.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // 等待一段時間確保所有初始化完成
    await page.waitForTimeout(8000);
    
    // 報告所有捕獲的訊息
    console.log('\n=== Console 訊息摘要 ===');
    for (const [type, messages] of Object.entries(consoleMessages)) {
      if (messages.length > 0) {
        console.log(`${type.toUpperCase()} (${messages.length}):`);
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}: ${msg.substring(0, 200)}${msg.length > 200 ? '...' : ''}`);
        });
        console.log('');
      }
    }
    
    // 再次檢查 DOM 狀態
    console.log('=== DOM 狀態檢查 ===');
    const rootElement = await page.$('#root');
    if (rootElement) {
      const rootInnerHTML = await rootElement.innerHTML();
      const childCount = await rootElement.evaluate(el => el.children.length);
      console.log(`#root 內容長度: ${rootInnerHTML.length}`);
      console.log(`#root 子元素數量: ${childCount}`);
      
      // 檢查是否有任何可見的內容
      const hasVisibleContent = await rootElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               el.offsetWidth > 0 && 
               el.offsetHeight > 0;
      });
      console.log(`#root 是否有可見內容: ${hasVisibleContent}`);
    }
    
    // 檢查是否有錯誤邊界或替代內容
    const hasErrorBoundary = await page.evaluate(() => {
      return !!document.querySelector('[data-reactroot]') || 
             !!document.querySelector('.react-error-boundary') ||
             !!document.querySelector('[role="alert"]');
    });
    console.log(`檢測到錯誤邊界或相關元素: ${hasErrorBoundary}`);
    
    // 截圖
    await page.screenshot({ path: 'vercel-console-test.png', fullPage: true });
    console.log('\n截圖已儲存為 vercel-console-test.png');
    
  } catch (error) {
    console.error('檢查過程中發生錯誤:', error);
  } finally {
    await browser.close();
    console.log('\n檢查完成');
  }
})();