#!/usr/bin/env node
/**
 * Playwright Stealth Scraper - 绕过反爬虫检测
 * 使用 Playwright Extra + Stealth Plugin
 */

import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

chromium.use(stealthPlugin());

async function scrape(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // 隐藏 webdriver 特征
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    // 等待页面稳定
    await page.waitForTimeout(2000);

    const content = await page.content();
    const title = await page.title();

    console.log(JSON.stringify({
      success: true,
      url,
      title,
      content,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      url,
      error: error.message,
    }));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

const url = process.argv[2];
if (!url) {
  console.error("Usage: playwright-stealth.js <url>");
  process.exit(1);
}

scrape(url).catch(console.error);
