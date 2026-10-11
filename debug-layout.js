const { chromium } = require('playwright');

(async () => {
  console.log('調試佈局問題...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173/', { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // 獲取外層容器和 main 元素的計算樣式
    const styles = await page.evaluate(() => {
      const outer = document.querySelector('div.min-h-screen');
      const main = document.querySelector('main');
      
      if (!outer || !main) return { error: 'Elements not found' };
      
      const outerStyle = window.getComputedStyle(outer);
      const mainStyle = window.getComputedStyle(main);
      
      return {
        outer: {
          display: outerStyle.display,
          flexDirection: outerStyle.flexDirection,
          justifyContent: outerStyle.justifyContent,
          alignItems: outerStyle.alignItems,
          width: outerStyle.width,
          height: outerStyle.height,
          minHeight: outerStyle.minHeight,
          position: outerStyle.position,
        },
        main: {
          display: mainStyle.display,
          width: mainStyle.width,
          maxWidth: mainStyle.maxWidth,
          marginLeft: mainStyle.marginLeft,
          marginRight: mainStyle.marginRight,
          marginTop: mainStyle.marginTop,
          marginBottom: mainStyle.marginBottom,
          position: mainStyle.position,
          left: mainStyle.left,
          right: mainStyle.right,
          top: mainStyle.top,
          bottom: mainStyle.bottom,
          boxSizing: mainStyle.boxSizing,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        }
      };
    });
    
    console.log('計算樣式:', JSON.stringify(styles, null, 2));
    
    // 也檢查 aside 元素
    const asideStyles = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      if (!aside) return { error: 'Aside not found' };
      const style = window.getComputedStyle(aside);
      return {
        display: style.display,
        width: style.width,
        maxWidth: style.maxWidth,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        position: style.position,
      };
    });
    
    console.log('\nAside 樣式:', JSON.stringify(asideStyles, null, 2));
    
  } catch (error) {
    console.error('調試過程中發生錯誤:', error);
  } finally {
    await browser.close();
  }
})();