import puppeteer from 'puppeteer';
import fs from 'fs';

const browser = await puppeteer.launch({
  headless: false,
  executablePath: '/usr/sbin/chromium',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1400,900'
  ]
});

const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

console.log('Navigating to GitHub trending...');
await page.goto('https://github.com/trending', { waitUntil: 'networkidle2' });
console.log('Page loaded, waiting for content...');

// Wait for specific GitHub elements
try {
  await page.waitForSelector('[data-testid="grid"]', { timeout: 10000 });
  console.log('Found grid element');
} catch (e) {
  console.log('Grid element not found, waiting for any article...');
  try {
    await page.waitForSelector('article', { timeout: 10000 });
    console.log('Found article element');
  } catch (e2) {
    console.log('No article found either');
  }
}

// Wait a bit more for JS to render
await new Promise(r => setTimeout(r, 3000));

// Take screenshot
const screenshotDir = './screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

await page.screenshot({
  path: './screenshots/github-debug.png',
  fullPage: false
});
console.log('Screenshot saved to ./screenshots/github-debug.png');

// Get page title and some content
const title = await page.title();
console.log('Page title:', title);

const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
console.log('Body text (first 500 chars):', bodyText);

await browser.close();
