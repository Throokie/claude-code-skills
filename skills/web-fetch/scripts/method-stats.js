#!/usr/bin/env node
/**
 * 工具优先级统计系统
 * 用途：记录各网站不同抓取方法的成功率、响应大小
 * 功能：
 * - 记录每次请求的结果（方法、成功/失败、内容大小、网页类型）
 * - 根据历史数据计算优先级
 * - 当某域名成功次数>20 时，使用优先级选择
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = __dirname + "/../data";
const STATS_FILE = DATA_DIR + "/method-stats.json";

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// 数据结构
// {
//   "example.com": {
//     "curl": { success: 10, failed: 2, totalBytes: 5280, avgBytes: 528 },
//     "playwright": { success: 8, failed: 1, totalBytes: 5500, avgBytes: 687 },
//     "lastUpdated": "2026-03-15T10:00:00.000Z"
//   }
// }

/**
 * 加载统计数据
 */
export function loadStats() {
  try {
    if (existsSync(STATS_FILE)) {
      return JSON.parse(readFileSync(STATS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("加载统计数据失败:", e.message);
  }
  return {};
}

/**
 * 保存统计数据
 */
export function saveStats(stats) {
  try {
    writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf8");
  } catch (e) {
    console.error("保存统计数据失败:", e.message);
  }
}

/**
 * 提取域名
 */
export function extractDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * 检测网页类型
 */
export function detectPageType(html, url) {
  if (!html) return "unknown";

  const lower = html.toLowerCase();

  // 检测常见网页类型
  if (lower.includes("<article") || lower.includes("wp-content")) return "blog";
  if (lower.includes("product") || lower.includes("price") || lower.includes("cart")) return "ecommerce";
  if (lower.includes("login") || lower.includes("sign in")) return "auth";
  if (lower.includes("Just a moment") || lower.includes("__cf_chl")) return "cloudflare";
  if (lower.includes("<title>404") || lower.includes("not found")) return "error";
  if (lower.includes("<title>403") || lower.includes("forbidden")) return "forbidden";
  if (lower.includes("stackoverflow.com")) return "q&a";
  if (lower.includes("github.com")) return "code";
  if (lower.includes("reddit.com")) return "social";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "social";
  if (lower.includes("news") || lower.includes("article")) return "news";
  if (lower.includes("wiki")) return "wiki";
  if (lower.includes("document") || lower.includes("api")) return "docs";

  return "general";
}

/**
 * 记录请求结果
 */
export function recordResult(url, method, success, contentLength, pageTitle = "") {
  const stats = loadStats();
  const domain = extractDomain(url);
  const pageType = detectPageType(pageTitle || "", url);

  if (!stats[domain]) {
    stats[domain] = {};
  }

  if (!stats[domain][method]) {
    stats[domain][method] = {
      success: 0,
      failed: 0,
      totalBytes: 0,
      pageTypes: {},
    };
  }

  const methodStats = stats[domain][method];

  if (success) {
    methodStats.success++;
    methodStats.totalBytes += contentLength;

    // 记录网页类型
    if (!methodStats.pageTypes[pageType]) {
      methodStats.pageTypes[pageType] = 0;
    }
    methodStats.pageTypes[pageType]++;
  } else {
    methodStats.failed++;
  }

  methodStats.lastUpdated = new Date().toISOString();
  methodStats.avgBytes = Math.round(methodStats.totalBytes / (methodStats.success || 1));

  saveStats(stats);

  return {
    domain,
    method,
    totalAttempts: methodStats.success + methodStats.failed,
    successRate: ((methodStats.success / (methodStats.success + methodStats.failed)) * 100).toFixed(1) + "%",
  };
}

/**
 * 获取所有统计摘要
 */
export function getStatsSummary() {
  const stats = loadStats();
  const summary = [];

  for (const [domain, domainStats] of Object.entries(stats)) {
    const methods = Object.entries(domainStats)
      .filter(([m]) => m !== "lastUpdated")
      .map(([method, data]) => ({
        method,
        ...data,
      }));

    summary.push({
      domain,
      methods,
      totalRequests: methods.reduce((sum, m) => sum + m.success + m.failed, 0),
    });
  }

  return summary.sort((a, b) => b.totalRequests - a.totalRequests);
}

/**
 * 导出为可读格式
 */
export function formatStatsReport() {
  const summary = getStatsSummary();

  let report = "# 工具请求成功统计\n\n";
  report += `**更新时间**: ${new Date().toLocaleString("zh-CN")}\n\n`;

  if (summary.length === 0) {
    report += "暂无统计数据。\n";
    return report;
  }

  report += "| 域名 | 方法 | 成功 | 失败 | 成功率 | 平均大小 | 主要网页类型 |\n";
  report += "|------|------|------|------|--------|----------|-------------|\n";

  for (const domain of summary) {
    const firstMethod = domain.methods[0];
    const pageTypes = firstMethod?.pageTypes || {};
    const topPageType = Object.entries(pageTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    for (const method of domain.methods) {
      const total = method.success + method.failed;
      const rate = total > 0 ? ((method.success / total) * 100).toFixed(1) + "%" : "0%";
      const avgBytes = method.avgBytes || 0;
      const avgSize = avgBytes > 1024 ? (avgBytes / 1024).toFixed(1) + "KB" : avgBytes + "B";

      report += `| ${domain.domain} | ${method.method} | ${method.success} | ${method.failed} | ${rate} | ${avgSize} | ${topPageType} |\n`;
    }
  }

  return report;
}
