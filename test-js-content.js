const { chromium } = require('playwright');

(async () => {
  console.log('檢查 Vercel 部署的 JavaScript 內容');
  
  // 啟動瀏覽器
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 導航到網站
    console.log('導航到網站...');
    await page.goto('https://plks.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // 等待一段時間
    await page.waitForTimeout(3000);
    
    // 獲取已載入的腳本
    const scriptSources = await page.$$eval('script[src]', elements => 
      elements.map(el => el.src)
    );
    
    console.log(`找到 ${scriptSources.length} 個外部腳本:`);
    scriptSources.forEach((src, index) => {
      console.log(`  ${index + 1}: ${src}`);
    });
    
    // 獲取第一個腳本的內容
    if (scriptSources.length > 0) {
      const firstScriptSrc = scriptSources[0];
      console.log(`\n獲取腳本內容: ${firstScriptSrc}`);
      
      // 使用頁面的 fetch 功能獲取腳本內容
      const scriptContent = await page.evaluate(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
      }, firstScriptSrc);
      
      console.log(`腳本內容長度: ${scriptContent.length} 個字元`);
      console.log(`腳本內容預覽 (前 500 個字元):\n${scriptContent.substring(0, 500)}`);
      
      if (scriptContent.length > 500) {
        console.log(`\n腳本內容結尾預覽 (後 500 個字元):\n${scriptContent.substring(Math.max(0, scriptContent.length - 500))}`);
      }
      
      // 檢查是否看起來像是一個正常的 React 應用 bundle
      const hasReact = scriptContent.includes('React') || scriptContent.includes('react');
      const hasCreateRoot = scriptContent.includes('createRoot') || scriptContent.includes('hydrateRoot');
      const hasRender = scriptContent.includes('render') || scriptContent.includes('renderRoot');
      
      console.log(`\nReact 相關檢查:`);
      console.log(`  包含 'React': ${hasReact}`);
      console.log(`  包含 'createRoot' 或 'hydrateRoot': ${hasCreateRoot}`);
      console.log(`  包含 'render': ${hasRender}`);
      
      // 檢查是否可能是壓縮過的代碼
      const isLikelyMinified = scriptContent.length > 1000 && 
                              (scriptContent.split(' ').length < 50 ||  // 很少的空格
                               scriptContent.split('\n').length < 10);  // 很少的換行
      console.log(`  看起來像是壓縮代碼: ${isLikelyMinified}`);
      
      // 檢查常見的構建標誌
      const hasWebpack = scriptContent.includes('webpack') || scriptContent.includes('__webpack_require__');
      const hasVite = scriptContent.includes('vite') || scriptContent.includes('__vite__');
      console.log(`  包含 Webpack 標誌: ${hasWebpack}`);
      console.log(`  包含 Vite 標誌: ${hasVite}`);
    }
    
  } catch (error) {
    console.error('檢查過程中發生錯誤:', error);
  } finally {
    await browser.close();
    console.log('\n檢查完成');
  }
})();