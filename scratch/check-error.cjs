const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER_ERROR:', error.message));

  console.log("Navigating to localhost:5173/promo...");
  try {
    await page.goto('http://localhost:5173/promo', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.log("Navigation ended or timed out: " + e.message);
  }
  
  await browser.close();
})();
