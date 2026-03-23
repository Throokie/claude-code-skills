#!/usr/bin/env node
/**
 * 网页内容获取工具 - 并发增强版
 * 用途：并发使用多种策略获取网页内容，比对结果选出最佳
 * 创建：2026-03-15
 * 增强：2026-03-15 v2 - 并发模式 + 结果比对
 *
 * 并发策略：
 * - 免费工具 (curl, playwright) 同时执行
 * - 汇总结果后比对，选出内容最完整的
 */

import { execSync } from "child_process";
import process from "node:process";
import { promisify } from "util";
import { exec as execCallback } from "child_process";
import { recordResult, formatStatsReport } from "./method-stats.js";

const execAsync = promisify(execCallback);

// ============================================================================
// 配置常量
// ============================================================================
const CONFIG = {
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  INITIAL_DELAY: 2000,
  // 黑名单域名（禁止使用）
  BLOCKED_DOMAINS: [
    "example.com",
    "example.org",
    "example.net",
  ],
  // 推荐测试域名
  TEST_DOMAINS: [
    "baidu.com",
    "wikipedia.org",
    "github.com",
  ],
  USER_AGENTS: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  ],
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
// 参数解析
// ============================================================================
function usage(exitCode = 0) {
  console.error([
    "用法：fetch-page.mjs <url> [选项]",
    "",
    "选项:",
    "  --method METHOD     抓取方法：curl, playwright, github-cli, all, auto (默认：auto)",
    "  --timeout MS        超时时间 (毫秒，默认：30000)",
    "  --retry             启用重试 (默认：true)",
    "  --no-retry          禁用重试",
    "  --output FILE       输出到文件",
    "  --screenshot FILE   保存截图",
    "  --wait N            等待 N 秒后获取内容",
    "  --ua UA             自定义 User-Agent",
    "  --json              JSON 输出格式",
    "  --compare           启用多方法比对模式",
    "  --stats             显示统计报告",
    "  -h, --help          显示帮助",
    "",
    "方法说明:",
    "  - curl:        最快，适合静态内容",
    "  - playwright:  最强，绕过反爬虫检测",
    "  - github-cli:  GitHub 仓库专用，使用 gh auth 认证",
    "  - auto:        自动选择最佳方法 (GitHub 仓库优先使用 github-cli)",
  ].join("\n"));
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    url: null,
    method: "auto",
    timeout: CONFIG.DEFAULT_TIMEOUT,
    retry: true,
    output: null,
    screenshot: null,
    wait: 0,
    ua: null,
    json: false,
    compare: false,
    stats: false,
  };

  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") usage(0);
    if (!a.startsWith("-")) {
      positionals.push(a);
      continue;
    }
    const key = a;
    if (key === "--method") {
      const v = argv[++i];
      if (!v) usage(2);
      if (!["auto", "curl", "playwright", "github-cli", "all"].includes(v)) {
        log("--method 必须是：auto, curl, playwright, github-cli, all", "error");
        process.exit(2);
      }
      args.method = v;
    } else if (key === "--timeout") {
      const v = argv[++i];
      if (!v) usage(2);
      args.timeout = parseInt(v, 10);
    } else if (key === "--retry") {
      args.retry = true;
    } else if (key === "--no-retry") {
      args.retry = false;
    } else if (key === "--output") {
      const v = argv[++i];
      if (!v) usage(2);
      args.output = v;
    } else if (key === "--screenshot") {
      const v = argv[++i];
      if (!v) usage(2);
      args.screenshot = v;
    } else if (key === "--wait") {
      const v = argv[++i];
      if (!v) usage(2);
      args.wait = parseInt(v, 10);
    } else if (key === "--ua") {
      const v = argv[++i];
      if (!v) usage(2);
      args.ua = v;
    } else if (key === "--json") {
      args.json = true;
    } else if (key === "--compare") {
      args.compare = true;
    } else if (key === "--stats") {
      args.stats = true;
    } else {
      log(`未知参数：${a}`, "error");
      usage(2);
    }
  }

  if (positionals.length === 0 && !args.stats) {
    log("缺少 URL 参数", "error");
    usage(2);
  }
  if (positionals.length > 0) {
    args.url = positionals[0];
  }

  // 验证 URL（stats 模式不需要）
  if (!args.stats) {
    try {
      const parsedUrl = new URL(args.url);
      const hostname = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

      // 检查黑名单域名
      for (const blocked of CONFIG.BLOCKED_DOMAINS) {
        if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
          log(`禁止访问的域名：${blocked}`, "error");
          log(`推荐使用：${CONFIG.TEST_DOMAINS.join(", ")}`, "info");
          process.exit(2);
        }
      }
    } catch {
      log("无效的 URL 格式", "error");
      process.exit(2);
    }
  }

  return args;
}

// ============================================================================
// 工具函数
// ============================================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomUA() {
  return CONFIG.USER_AGENTS[Math.floor(Math.random() * CONFIG.USER_AGENTS.length)];
}

function runCommand(cmd, timeoutMs) {
  try {
    const output = execSync(cmd, {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024, // 50MB
      timeout: timeoutMs,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output, error: null };
  } catch (error) {
    if (error.status === 28 || error.message.includes("timeout")) {
      return { success: false, output: null, error: "请求超时" };
    }
    const stderr = error.stderr?.toString() || error.message;
    return { success: false, output: null, error: stderr };
  }
}

// ============================================================================
// 抓取方法
// ============================================================================

/**
 * 检测是否为 GitHub 仓库 URL
 */
function isGitHubRepoUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return false;
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    return pathParts.length >= 2; // owner/repo
  } catch {
    return false;
  }
}

/**
 * 提取 GitHub 仓库信息
 */
function extractGitHubRepoInfo(url) {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  return {
    owner: pathParts[0],
    repo: pathParts[1],
  };
}

/**
 * 方法 0: GitHub CLI (针对 GitHub 仓库的最佳方法)
 */
async function fetchWithGitHubCli(url, options) {
  const { owner, repo } = extractGitHubRepoInfo(url);

  // 获取仓库基本信息
  const cmd = `gh repo view ${owner}/${repo} --json name,description,url,defaultBranchRef,primaryLanguage,pushedAt,createdAt,stargazerCount,forkCount,licenseInfo --jq .`;

  const startTime = Date.now();
  const result = runCommand(cmd, options.timeout);
  const elapsed = Date.now() - startTime;

  if (result.success && result.output?.length > 10) {
    try {
      const data = JSON.parse(result.output);

      // 获取 README 内容
      const defaultBranch = data.defaultBranchRef?.name || "main";
      const readmeCmd = `gh api repos/${owner}/${repo}/readme --jq '.content' | base64 -d 2>/dev/null || echo ""`;
      const readmeResult = runCommand(readmeCmd, options.timeout);
      const readmeContent = readmeResult.success ? readmeResult.output : "";

      // 获取最新 commit
      const commitCmd = `gh api repos/${owner}/${repo}/commits/${defaultBranch} --jq '.commit.message' | head -1`;
      const commitResult = runCommand(commitCmd, Math.min(options.timeout, 10000));
      const latestCommit = commitResult.success ? commitResult.output : "";

      // 构建内容
      const content = `# ${data.name}

**描述**: ${data.description || "N/A"}
**URL**: ${data.url || url}
**默认分支**: ${defaultBranch}
**主要语言**: ${data.primaryLanguage?.name || "N/A"}
**Stars**: ${data.stargazerCount || 0} | **Forks**: ${data.forkCount || 0}
**创建于**: ${data.createdAt || "N/A"} | **最后推送**: ${data.pushedAt || "N/A"}
**License**: ${data.licenseInfo?.name || "N/A"}

## 最新提交
${latestCommit || "N/A"}

## README

${readmeContent}
`;

      return {
        success: true,
        method: "github-cli",
        content: content,
        title: `${data.name}: ${data.description || "GitHub Repository"}`,
        elapsed,
        contentLength: content.length,
      };
    } catch (e) {
      return {
        success: false,
        method: "github-cli",
        error: "GitHub CLI 解析失败：" + e.message,
        elapsed,
        contentLength: 0,
      };
    }
  }
  return {
    success: false,
    method: "github-cli",
    error: result.error || "GitHub CLI 抓取失败",
    elapsed,
    contentLength: 0,
  };
}

/**
 * 方法 1: curl (最快，适合静态内容)
 */
async function fetchWithCurl(url, options) {
  const ua = options.ua || getRandomUA();
  const cmd = `curl -s -L -4 --max-time ${Math.floor(options.timeout / 1000)} --insecure -A "${ua}" "${url}"`;

  const startTime = Date.now();
  const result = runCommand(cmd, options.timeout);
  const elapsed = Date.now() - startTime;

  if (result.success && result.output?.length > 100) {
    // 检测 Cloudflare 验证页面
    if (result.output.includes("Just a moment") ||
        result.output.includes("__cf_chl") ||
        result.output.includes("cdn-cgi/challenge")) {
      return {
        success: false,
        method: "curl",
        error: "Cloudflare 验证页面",
        elapsed,
        contentLength: 0,
      };
    }
    return {
      success: true,
      method: "curl",
      content: result.output,
      title: extractTitle(result.output),
      elapsed,
      contentLength: result.output.length,
    };
  }
  return {
    success: false,
    method: "curl",
    error: result.error || "curl 抓取失败",
    elapsed,
    contentLength: 0,
  };
}

/**
 * 方法 2: playwright (最强，绕过反爬虫)
 */
async function fetchWithPlaywright(url, options) {
  const scriptPath = new URL("./playwright-stealth.js", import.meta.url).pathname;
  const cmd = `node "${scriptPath}" "${url}" 2>&1`;

  const startTime = Date.now();
  const result = runCommand(cmd, options.timeout);
  const elapsed = Date.now() - startTime;

  if (result.success && result.output?.length > 100) {
    try {
      const data = JSON.parse(result.output);
      return {
        success: true,
        method: "playwright",
        content: data.content || data.html,
        title: data.title,
        elapsed,
        contentLength: (data.content || data.html)?.length || 0,
      };
    } catch (e) {
      return {
        success: false,
        method: "playwright",
        error: "JSON 解析失败：" + e.message,
        elapsed,
        contentLength: 0,
      };
    }
  }
  return {
    success: false,
    method: "playwright",
    error: result.error || "Playwright 抓取失败",
    elapsed,
    contentLength: 0,
  };
}

// ============================================================================
// 辅助函数
// ============================================================================
function extractTitle(html) {
  if (!html) return "Unknown";
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : "Unknown";
}

function extractDomainForStats(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * 并发执行多个抓取方法
 */
async function fetchConcurrent(url, options) {
  const isGitHub = isGitHubRepoUrl(url);

  // GitHub 仓库优先使用 GitHub CLI
  const methods = isGitHub
    ? [
        { name: "github-cli", fn: () => fetchWithGitHubCli(url, options) },
        { name: "curl", fn: () => fetchWithCurl(url, options) },
        { name: "playwright", fn: () => fetchWithPlaywright(url, options) },
      ]
    : [
        { name: "curl", fn: () => fetchWithCurl(url, options) },
        { name: "playwright", fn: () => fetchWithPlaywright(url, options) },
      ];

  log(`并发执行 ${methods.length} 个方法${isGitHub ? " (GitHub 仓库使用 gh CLI)" : ""}...`, "info");

  const startTime = Date.now();
  const results = await Promise.allSettled(methods.map(m => m.fn().catch(e => ({
    success: false,
    method: m.name,
    error: e.message,
    elapsed: Date.now() - startTime,
    contentLength: 0,
  }))));

  const elapsed = Date.now() - startTime;

  // 解析结果
  const resultsData = results.map((r, i) => ({
    ...methods[i],
    result: r.status === "fulfilled" ? r.value : {
      success: false,
      method: methods[i].name,
      error: r.reason?.message || String(r.reason),
      elapsed: elapsed,
      contentLength: 0,
    },
  }));

  // 显示各方法结果
  console.log("\n## 各方法结果\n");
  console.log("| 方法 | 状态 | 耗时 | 内容长度 |");
  console.log("|------|------|------|----------|");
  for (const item of resultsData) {
    const status = item.result.success ? "✅ 成功" : `❌ ${item.result.error}`;
    const length = item.result.contentLength || 0;
    console.log(`| ${item.name} | ${status} | ${(item.result.elapsed / 1000).toFixed(2)}s | ${length} bytes |`);
  }
  console.log("");

  // 选出最佳结果（优先成功且内容最长的）
  const successfulResults = resultsData
    .filter(item => item.result.success)
    .sort((a, b) => b.result.contentLength - a.result.contentLength);

  if (successfulResults.length === 0) {
    // 都失败了，返回错误信息最多的那个
    const bestFailed = resultsData.sort((a, b) => b.result.error.length - a.result.error.length)[0];
    return {
      success: false,
      results: resultsData.map(item => item.result),
      error: bestFailed.result.error,
      elapsed,
    };
  }

  const best = successfulResults[0];
  log(`选择 ${best.name} 方法的结果（内容最完整）`, "success");

  return {
    success: true,
    bestMethod: best.name,
    bestResult: best.result,
    allResults: resultsData.map(item => ({
      method: item.name,
      success: item.result.success,
      contentLength: item.result.contentLength,
      elapsed: item.result.elapsed,
    })),
    elapsed,
  };
}

// ============================================================================
// 主逻辑
// ============================================================================
async function main() {
  const startTime = Date.now();

  try {
    // 1. 解析参数
    const args = parseArgs(process.argv.slice(2));

    // 特殊模式：显示统计报告
    if (args.stats) {
      console.log(formatStatsReport());
      process.exit(0);
    }

    // 2. 显示状态
    log(`开始获取网页：${args.url}`, "info");
    log(`方法：${args.method}, 超时：${args.timeout}ms`, "info");

    // 3. 执行抓取
    let finalResult;

    if (args.method === "all" || args.compare || (args.method === "auto" && args.timeout >= 30000)) {
      // 并发模式
      finalResult = await fetchConcurrent(args.url, args);
    } else if (args.method === "curl") {
      finalResult = await fetchWithCurl(args.url, args);
    } else if (args.method === "playwright") {
      finalResult = await fetchWithPlaywright(args.url, args);
    } else if (args.method === "github-cli" || (args.method === "auto" && isGitHubRepoUrl(args.url))) {
      // GitHub 仓库优先使用 gh CLI
      finalResult = await fetchWithGitHubCli(args.url, args);
    } else {
      // auto 模式：先 curl，失败再 playwright
      const curlResult = await fetchWithCurl(args.url, args);
      if (curlResult.success) {
        finalResult = curlResult;
      } else {
        log(`curl 失败 (${curlResult.error})，尝试 playwright...`, "warning");
        finalResult = await fetchWithPlaywright(args.url, args);
      }
    }

    // 4. 输出结果
    const elapsed = Date.now() - startTime;

    // 记录统计结果
    const contentForStats = finalResult.content || finalResult.bestResult?.content || "";
    const titleForStats = finalResult.title || finalResult.bestResult?.title || "";
    const methodForStats = finalResult.method || finalResult.bestMethod || args.method;

    if (finalResult.success) {
      const recordInfo = recordResult(
        args.url,
        methodForStats,
        true,
        contentForStats.length,
        titleForStats
      );
      log(`统计已更新：${recordInfo.domain} - ${methodForStats} (${recordInfo.successRate})`, "info");
    } else if (finalResult.error) {
      recordResult(args.url, methodForStats, false, 0, "");
    }

    if (args.json) {
      console.log(JSON.stringify({
        success: finalResult.success,
        url: args.url,
        title: finalResult.title || finalResult.bestResult?.title,
        method: finalResult.method || finalResult.bestMethod,
        content: finalResult.content || finalResult.bestResult?.content,
        elapsed,
        allResults: finalResult.allResults,
      }, null, 2));
    } else {
      if (finalResult.success) {
        console.log("## 网页内容\n");
        console.log(`**URL**: ${args.url}`);
        console.log(`**标题**: ${finalResult.title || finalResult.bestResult?.title}`);
        console.log(`**方法**: ${finalResult.method || finalResult.bestMethod}`);
        console.log(`**总耗时**: ${(elapsed / 1000).toFixed(2)}s`);
        if (finalResult.allResults) {
          console.log("\n### 方法对比\n");
          console.log("| 方法 | 状态 | 耗时 | 内容长度 |");
          console.log("|------|------|------|----------|");
          for (const r of finalResult.allResults) {
            console.log(`| ${r.method} | ${r.success ? "✅" : "❌"} | ${(r.elapsed / 1000).toFixed(2)}s | ${r.contentLength} bytes |`);
          }
        }
        console.log("\n---\n");
        console.log((finalResult.content || finalResult.bestResult?.content)?.substring(0, 5000));
      } else {
        log(`获取失败：${finalResult.error}`, "error");
        if (finalResult.results) {
          console.log("\n## 各方法详细错误\n");
          for (const r of finalResult.results) {
            console.log(`- **${r.method}**: ${r.error}`);
          }
        }
      }
    }

    // 5. 保存到文件（可选）
    if (args.output && finalResult.success) {
      const fs = await import("fs");
      const content = finalResult.content || finalResult.bestResult?.content;
      fs.writeFileSync(args.output, content);
      log(`内容已保存到：${args.output}`, "success");
    }

    log("获取完成", finalResult.success ? "success" : "error");
    process.exit(finalResult.success ? 0 : 1);

  } catch (error) {
    const elapsed = Date.now() - startTime;

    log(`获取失败：${error.message}`, "error");
    log(`总耗时：${(elapsed / 1000).toFixed(2)}s`, "info");

    // 提供建议
    console.log("\n## 建议\n");
    console.log("- 检查网络连接：`curl -I <url>`");
    console.log("- 尝试并发模式：`--method all --compare`");
    console.log("- 增加超时时间：`--timeout 60000`");
    console.log("- 添加等待时间：`--wait 5`");

    process.exit(1);
  }
}

main();
