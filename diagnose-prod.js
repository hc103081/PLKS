const { chromium } = require('playwright');

(async () => {
  console.log('診斷生產環境 API 呼叫問題...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    // 攔截 API 請求
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });
    
    const apiResponses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
        });
      }
    });
    
    await page.goto('https://plks.vercel.app/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    console.log('=== Console 錯誤 ===');
    consoleErrors.forEach((e, i) => console.log(`  ${i+1}: ${e.substring(0, 200)}`));
    
    console.log('\n=== 失敗的請求 ===');
    failedRequests.forEach((r, i) => console.log(`  ${i+1}: ${r.url} - ${r.failure?.errorText}`));
    
    console.log('\n=== API 請求 ===');
    apiRequests.forEach((r, i) => console.log(`  ${i+1}: ${r.method} ${r.url}`));
    
    console.log('\n=== API 回應 ===');
    apiResponses.forEach((r, i) => console.log(`  ${i+1}: ${r.status} ${r.statusText} - ${r.url}`));
    
    // 嘗試直接呼叫 API
    console.log('\n=== 直接測試 API ===');
    const apiTest = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/courses');
        return {
          status: response.status,
          statusText: response.statusText,
          text: await response.text().catch(() => 'no body')
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log('GET /api/courses:', JSON.stringify(apiTest, null, 2));
    
  } catch (error) {
    console.error('診斷過程中發生錯誤:', error);
  } finally {
    await browser.close();
  }
})();