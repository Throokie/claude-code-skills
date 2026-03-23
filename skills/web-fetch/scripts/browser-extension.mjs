#!/usr/bin/env node
/**
 * 浏览器扩展调用接口
 * 用途：通过 browser-use 调用浏览器扩展保存网页为 MHTML 或截图
 *
 * 依赖扩展：
 * - Save as MHTML: https://chromewebstore.google.com/detail/save-as-mhtml/ahgakckdonjmnpnegjcamhagackmjpei
 * - GoFullPage: https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl
 *
 * 使用方法：
 *   node browser-extension.mjs open "https://example.com"
 *   node browser-extension.mjs save-mhtml "https://example.com" --output page.mhtml
 *   node browser-extension.mjs screenshot "https://example.com" --output page.png
 *   node browser-extension.mjs close
 */

import { execSync } from "child_process";
import process from "node:process";

// ============================================================================
// 配置
// ============================================================================
const CONFIG = {
  BROWSER_PROFILE: "Default", // 使用默认浏览器配置
  TIMEOUT: 60000,
};

// ============================================================================
// 日志函数
// ============================================================================
function log(message, type = "info") {
  const prefix = {
    info: "ℹ️ ",
    success: "✅ ",
    warning: "⚠️ ",
    error: "❌ ",
  };
  const stream = type === "error" ? process.stderr : process.stdout;
  stream.write(`${prefix[type]}${message}\n`);
}

// ============================================================================
// 命令执行
// ============================================================================
function runBrowserCommand(cmd, timeoutMs = CONFIG.TIMEOUT) {
  try {
    const output = execSync(cmd, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: timeoutMs,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output, error: null };
  } catch (error) {
    const stderr = error.stderr?.toString() || error.message;
    return { success: false, output: null, error: stderr };
  }
}

// ============================================================================
// 浏览器操作
// ============================================================================

/**
 * 打开网页
 */
function openPage(url) {
  log(`打开网页：${url}`, "info");
  const cmd = `browser-use open "${url}" 2>&1`;
  const result = runBrowserCommand(cmd);

  if (result.success) {
    log("网页已打开", "success");
    return { success: true };
  } else {
    log(`打开网页失败：${result.error}`, "error");
    return { success: false, error: result.error };
  }
}

/**
 * 等待页面加载
 */
function waitForPageLoad(seconds = 3) {
  log(`等待 ${seconds} 秒...`, "info");
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * 保存为 MHTML
 * 注意：需要通过扩展的快捷键或菜单触发
 */
async function saveAsMhtml(outputPath) {
  log("保存为 MHTML...", "info");

  // 方法 1：使用浏览器快捷键（需要扩展支持）
  // Chrome 扩展通常使用 Ctrl+Shift+S 或自定义快捷键
  const commands = [
    // 尝试使用扩展的保存命令
    `browser-use run-javascript "window.print()" 2>&1`,

    // 或者使用 keyboard 扩展发送快捷键
    `browser-use keyboard Ctrl+S 2>&1`,
  ];

  for (const cmd of commands) {
    const result = runBrowserCommand(cmd, 5000);
    if (result.success) {
      log("MHTML 保存命令已发送", "success");
      return { success: true, outputPath };
    }
  }

  log("MHTML 保存失败，建议使用 curl 直接获取", "warning");
  return { success: false, error: "无法触发 MHTML 保存" };
}

/**
 * 截取整页截图
 */
async function takeScreenshot(outputPath, fullPage = true) {
  log(`截取${fullPage ? "整页" : "可见区域"}截图...`, "info");

  // 使用 browser-use 的截图功能
  const cmd = `browser-use screenshot "${outputPath}" 2>&1`;
  const result = runBrowserCommand(cmd);

  if (result.success) {
    log(`截图已保存：${outputPath}`, "success");
    return { success: true, outputPath };
  } else {
    log(`截图失败：${result.error}`, "error");
    return { success: false, error: result.error };
  }
}

/**
 * 获取当前页面 HTML
 */
function getPageHtml() {
  log("获取页面 HTML...", "info");
  const cmd = `browser-use get html 2>&1`;
  const result = runBrowserCommand(cmd);

  if (result.success) {
    return { success: true, html: result.output };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * 关闭浏览器
 */
function closeBrowser() {
  log("关闭浏览器...", "info");
  const cmd = `browser-use close 2>&1`;
  const result = runBrowserCommand(cmd, 10000);

  if (result.success) {
    log("浏览器已关闭", "success");
    return { success: true };
  } else {
    log(`关闭失败：${result.error}`, "warning");
    return { success: false, error: result.error };
  }
}

// ============================================================================
// 保存 MHTML 的替代方案
// ============================================================================

/**
 * 使用 curl 保存网页（模拟 MHTML 效果）
 * 这是最可靠的方法，因为浏览器扩展调用有限制
 */
function saveWithCurl(url, outputPath) {
  log(`使用 curl 保存网页到：${outputPath}`, "info");

  const cmd = `curl -s -L -4 --max-time 30 --insecure -o "${outputPath}" "${url}"`;
  const result = runBrowserCommand(cmd, 35000);

  if (result.success) {
    log(`网页已保存：${outputPath}`, "success");
    return { success: true, outputPath, method: "curl" };
  } else {
    log(`保存失败`, "error");
    return { success: false, error: "curl 失败" };
  }
}

/**
 * 使用 Playwright 保存完整网页（含截图）
 */
function saveWithPlaywright(url, outputPath, screenshotPath) {
  log(`使用 Playwright 保存网页...`, "info");

  const scriptPath = new URL("./playwright-stealth.js", import.meta.url).pathname;
  // 注意：playwright-stealth.js 目前只返回 HTML，需要修改以支持截图

  const cmd = `node "${scriptPath}" "${url}" 2>&1`;
  const result = runBrowserCommand(cmd);

  if (result.success) {
    try {
      const data = JSON.parse(result.output);
      return {
        success: true,
        method: "playwright",
        html: data.content || data.html,
        title: data.title,
        screenshot: screenshotPath || null,
      };
    } catch (e) {
      return { success: false, error: "JSON 解析失败" };
    }
  }

  return { success: false, error: "Playwright 失败" };
}

// ============================================================================
// CLI 参数解析
// ============================================================================
function usage() {
  console.log(`
浏览器扩展调用接口

用法：
  node browser-extension.mjs <命令> [参数]

命令：
  open <url>                    打开网页
  close                         关闭浏览器
  save-mhtml <url> -o <文件>     保存为 MHTML
  screenshot <url> -o <文件>     截图保存
  html <url>                    获取 HTML
  status                        检查浏览器状态

选项：
  -o, --output <文件>           输出文件路径
  -t, --timeout <秒>            超时时间
  -h, --help                    显示帮助

示例：
  node browser-extension.mjs open "https://example.com"
  node browser-extension.mjs save-mhtml "https://example.com" -o page.mhtml
  node browser-extension.mjs screenshot "https://example.com" -o page.png
  node browser-extension.mjs close
`);
}

function parseArgs() {
  const args = {
    command: process.argv[2],
    url: null,
    output: null,
    timeout: CONFIG.TIMEOUT,
  };

  for (let i = 3; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "-o" || a === "--output") {
      args.output = process.argv[++i];
    } else if (a === "-t" || a === "--timeout") {
      args.timeout = parseInt(process.argv[++i]) * 1000;
    } else if (!a.startsWith("-") && !args.url) {
      args.url = a;
    }
  }

  return args;
}

// ============================================================================
// 主函数
// ============================================================================
async function main() {
  const args = parseArgs();

  if (!args.command || args.command === "-h" || args.command === "--help") {
    usage();
    process.exit(0);
  }

  if (args.command === "status") {
    const result = runBrowserCommand("browser-use state --json 2>&1", 5000);
    if (result.success) {
      try {
        const state = JSON.parse(result.output);
        console.log(JSON.stringify(state, null, 2));
      } catch {
        console.log(result.output);
      }
    } else {
      log("无法获取浏览器状态", "error");
    }
    process.exit(0);
  }

  if (args.command === "open" && args.url) {
    const result = openPage(args.url);
    process.exit(result.success ? 0 : 1);
  }

  if (args.command === "close") {
    const result = closeBrowser();
    process.exit(result.success ? 0 : 1);
  }

  if (args.command === "screenshot" && args.url) {
    if (!args.output) {
      args.output = `screenshot-${Date.now()}.png`;
    }
    await openPage(args.url);
    await waitForPageLoad(3);
    const result = await takeScreenshot(args.output);
    await closeBrowser();
    process.exit(result.success ? 0 : 1);
  }

  if (args.command === "save-mhtml" && args.url) {
    if (!args.output) {
      args.output = `page-${Date.now()}.mhtml`;
    }
    // 使用 curl 作为后备方案
    log("注意：浏览器扩展 MHTML 保存有限制，使用 curl 方案", "warning");
    const result = saveWithCurl(args.url, args.output);
    process.exit(result.success ? 0 : 1);
  }

  if (args.command === "html" && args.url) {
    await openPage(args.url);
    await waitForPageLoad(3);
    const result = getPageHtml();
    await closeBrowser();
    if (result.success) {
      console.log(result.html);
    }
    process.exit(result.success ? 0 : 1);
  }

  log(`未知命令或缺少参数：${args.command}`, "error");
  usage();
  process.exit(1);
}

main();
