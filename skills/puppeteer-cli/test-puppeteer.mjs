import puppeteer from 'puppeteer';
import fs from 'fs';

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/sbin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,720'
    ],
    dumpio: true
  });

  console.log('Browser launched, creating page...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating to example.com...');
  await page.goto('https://example.com', { waitUntil: 'networkidle2' });
  console.log('Navigation complete');

  // Check page content
  const title = await page.title();
  console.log('Page title:', title);

  const content = await page.evaluate(() => document.body.innerText);
  console.log('Page content:', content.substring(0, 200));

  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'screenshots/test-debug.png' });
  console.log('Screenshot saved to screenshots/test-debug.png');

  await browser.close();
  console.log('Browser closed');
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
