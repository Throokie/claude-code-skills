/**
 * Puppeteer CLI - 浏览器自动化命令行工具
 * 封装 Puppeteer 功能，支持导航、截图、点击、填写表单等操作
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取 __dirname (ESM 中没有)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 命令行参数解析
const args = process.argv.slice(2);
const command = args[0];

// 帮助信息
function showHelp() {
  console.log(`
Puppeteer CLI - 浏览器自动化工具

用法: puppeteer-cli <command> [options]

命令:
  navigate <url>              导航到指定 URL
  screenshot [name] [width] [height]  截取屏幕截图
  click <selector>            点击元素
  fill <selector> <value>     填写输入框
  select <selector> <value>   选择下拉菜单
  hover <selector>            悬停元素
  evaluate <code>             执行 JavaScript 代码
  close                       关闭浏览器

选项:
  --headless                  无头模式（默认）
  --headed                    有界面模式
  --timeout <ms>              设置超时（默认 30000ms）

环境变量:
  PUPPETEER_HEADLESS          设置默认 headless 模式
  PUPPETEER_EXECUTABLE_PATH   设置 Chrome 可执行路径

示例:
  puppeteer-cli navigate https://example.com
  puppeteer-cli screenshot myshot 800 600
  puppeteer-cli click "button#submit"
  puppeteer-cli fill "input[name=email]" "test@example.com"
`);
}

// 获取或创建浏览器实例
let browser = null;
let page = null;

// 自动检测 Chrome/Chromium 路径
function detectChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  // 常见 Linux 路径
  const commonPaths = [
    '/usr/sbin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chrome',
    '/opt/google/chrome/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

async function getBrowser(headless = true) {
  if (!browser) {
    const executablePath = detectChromePath();

    const launchOptions = {
      // Use new headless mode for better compatibility
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,720',
        // Anti-detection flags
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check'
      ]
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Anti-detection: override navigator.webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });

    await page.setViewport({ width: 1280, height: 720 });
  }
  return { browser, page };
}

// 导航命令
async function navigate(url) {
  if (!url) {
    console.error('错误: 需要提供 URL');
    process.exit(1);
  }

  const { page } = await getBrowser();

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`已导航到: ${url}`);
  } catch (error) {
    console.error(`导航失败: ${error.message}`);
    process.exit(1);
  }
}

// 截图命令
async function screenshot(name = 'screenshot', width = 1280, height = 720) {
  const { page } = await getBrowser();

  // 设置视口
  await page.setViewport({
    width: parseInt(width),
    height: parseInt(height)
  });

  // 等待页面渲染完成 - 多重等待策略
  try {
    // 等待 body 元素出现
    await page.waitForSelector('body', { timeout: 10000 });
    // 等待页面完全加载
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
    // 额外等待确保JavaScript渲染完成
    await page.waitForTimeout(3000);
  } catch (e) {
    // 继续截图，即使等待超时
    console.log('等待超时，继续截图');
  }

  // 确保 screenshots 目录存在
  const screenshotDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const filepath = path.join(screenshotDir, `${name}.png`);

  try {
    await page.screenshot({
      path: filepath,
      fullPage: false,
      type: 'png'
    });
    console.log(`截图已保存: ${filepath}`);
  } catch (error) {
    console.error(`截图失败: ${error.message}`);
    process.exit(1);
  }
}

// 点击命令
async function click(selector) {
  if (!selector) {
    console.error('错误: 需要提供 CSS 选择器');
    process.exit(1);
  }

  const { page } = await getBrowser();

  try {
    await page.click(selector);
    console.log(`已点击: ${selector}`);
  } catch (error) {
    console.error(`点击失败: ${error.message}`);
    process.exit(1);
  }
}

// 填写表单命令
async function fill(selector, value) {
  if (!selector || value === undefined) {
    console.error('错误: 需要提供选择器和值');
    process.exit(1);
  }

  const { page } = await getBrowser();

  try {
    await page.type(selector, value);
    console.log(`已填写: ${selector} = ${value}`);
  } catch (error) {
    console.error(`填写失败: ${error.message}`);
    process.exit(1);
  }
}

// 选择下拉菜单
async function select(selector, value) {
  if (!selector || value === undefined) {
    console.error('错误: 需要提供选择器和值');
    process.exit(1);
  }

  const { page } = await getBrowser();

  try {
    await page.select(selector, value);
    console.log(`已选择: ${selector} = ${value}`);
  } catch (error) {
    console.error(`选择失败: ${error.message}`);
    process.exit(1);
  }
}

// 悬停命令
async function hover(selector) {
  if (!selector) {
    console.error('错误: 需要提供 CSS 选择器');
    process.exit(1);
  }

  const { page } = await getBrowser();

  try {
    await page.hover(selector);
    console.log(`已悬停: ${selector}`);
  } catch (error) {
    console.error(`悬停失败: ${error.message}`);
    process.exit(1);
  }
}

// 执行 JavaScript
async function evaluate(code) {
  if (!code) {
    console.error('错误: 需要提供 JavaScript 代码');
    process.exit(1);
  }

  const { page } = await getBrowser();

  try {
    const result = await page.evaluate(new Function(code));
    console.log('执行结果:', result);
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    process.exit(1);
  }
}

// 关闭浏览器
async function close() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
    console.log('浏览器已关闭');
  }
}

// 主函数
async function main() {
  // 处理帮助
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  // 解析选项
  const headless = !args.includes('--headed');

  // 移除选项参数
  const cleanArgs = args.filter(arg => arg !== '--headless' && arg !== '--headed');

  switch (command) {
    case 'navigate':
    case 'nav':
    case 'goto':
      await navigate(cleanArgs[1]);
      break;

    case 'screenshot':
    case 'shot':
    case 'ss':
      await screenshot(cleanArgs[1], cleanArgs[2] || 1280, cleanArgs[3] || 720);
      break;

    case 'click':
      await click(cleanArgs[1]);
      break;

    case 'fill':
    case 'type':
    case 'input':
      await fill(cleanArgs[1], cleanArgs.slice(2).join(' '));
      break;

    case 'select':
      await select(cleanArgs[1], cleanArgs[2]);
      break;

    case 'hover':
      await hover(cleanArgs[1]);
      break;

    case 'evaluate':
    case 'eval':
    case 'js':
      await evaluate(cleanArgs.slice(1).join(' '));
      break;

    case 'close':
    case 'exit':
    case 'quit':
      await close();
      break;

    default:
      console.error(`未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// 运行主函数
main().catch(error => {
  console.error('错误:', error.message);
  process.exit(1);
});

// 进程退出时关闭浏览器
process.on('exit', () => {
  if (browser) {
    browser.close().catch(() => {});
  }
});

process.on('SIGINT', async () => {
  await close();
  process.exit(0);
});
