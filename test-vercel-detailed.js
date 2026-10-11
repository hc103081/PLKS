const { chromium } = require('playwright');

(async () => {
  console.log('開始詳細測試 Vercel 部署: https://plks.vercel.app/');
  
  // 啟動瀏覽器
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 監控 Console 訊息
    const consoleErrors = [];
    const consoleWarnings = [];
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      } else {
        consoleLogs.push(msg.text());
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
    
    // 監控響應
    const responses = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    });
    
    // 導航到網站
    console.log('導航到網站...');
    await page.goto('https://plks.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000
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
      
      // 檢查是否有 React 特有的屬性或文字
      const hasReactText = await rootElement.evaluate(el => el.innerText.length > 0);
      console.log(`#root 元素是否有文字內容: ${hasReactText}`);
    } else {
      console.log('#root 元素不存在!');
    }
    
    // 檢查 body 類別
    const bodyElement = await page.$('body');
    if (bodyElement) {
      const bodyClass = await bodyElement.getAttribute('class');
      console.log(`body 元素 class: "${bodyClass}"`);
    }
    
    // 檢查腳本載入情況
    const scripts = await page.$$eval('script[src]', elements => 
      elements.map(el => ({
        src: el.src,
        type: el.type,
        async: el.async,
        defer: el.defer
      }))
    );
    console.log(`\n已載入的腳本數量: ${scripts.length}`);
    scripts.forEach((script, index) => {
      console.log(`  ${index + 1}: ${script.src}`);
    });
    
    // 檢查內聯腳本
    const inlineScripts = await page.$$eval('script:not([src])', elements => 
      elements.map(el => el.textContent.substring(0, 100) + (el.textContent.length > 100 ? '...' : ''))
    );
    console.log(`\n內聯腳本數量: ${inlineScripts.length}`);
    inlineScripts.forEach((script, index) => {
      console.log(`  ${index + 1}: ${script}`);
    });
    
    // 報告 Console 錯誤
    if (consoleErrors.length > 0) {
      console.log('\n發現 Console 錯誤:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}: ${error}`);
      });
    } else {
      console.log('\n未發現 Console 錯誤');
    }
    
    if (consoleWarnings.length > 0) {
      console.log('\nConsole 警告:');
      consoleWarnings.forEach((warning, index) => {
        console.log(`  ${index + 1}: ${warning}`);
      });
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
    
    // 報告響應狀態（特別是 JS 檔案）
    const jsResponses = responses.filter(r => r.url.endsWith('.js'));
    if (jsResponses.length > 0) {
      console.log(`\nJavaScript 檔案響應狀態:`);
      jsResponses.forEach((resp, index) => {
        console.log(`  ${index + 1}: ${resp.url} - ${resp.status} ${resp.statusText}`);
      });
    }
    
    // 截圖
    await page.screenshot({ path: 'vercel-deploy-detailed-screenshot.png', fullPage: true });
    console.log('\n截圖已儲存為 vercel-deploy-detailed-screenshot.png');
    
    // 獲取頁面內容以便進一步分析
    const pageContent = await page.content();
    console.log(`\n頁面完整 HTML 長度: ${pageContent.length} 個字元`);
    
    // 檢查是否有常見的 React 應用標誌
    const hasReactRoot = await page.evaluate(() => {
      return !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    });
    console.log(`\n檢測到 React DevTools: ${hasReactRoot}`);
    
    // 檢查是否有 React 18 跡象
    const hasReact18 = await page.evaluate(() => {
      return !!window.React && !!React.version && React.version.startsWith('18');
    });
    console.log(`檢測到 React 18: ${hasReact18}`);
    
  } catch (error) {
    console.error('測試過程中發生錯誤:', error);
  } finally {
    await browser.close();
    console.log('\n測試完成，瀏覽器已關閉');
  }
})();