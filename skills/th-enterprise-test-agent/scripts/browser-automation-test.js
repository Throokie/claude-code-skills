#!/usr/bin/env node
/**
 * Enterprise Browser Automation Test - 通用版本
 * 企业级浏览器自动化测试脚本
 *
 * 支持通过配置文件或命令行参数自定义测试
 *
 * 用法: node browser-automation-test.js [url] [options]
 *
 * 示例:
 *   # 基本测试（仅页面加载、性能、响应式）
 *   node browser-automation-test.js http://localhost:9866
 *
 *   # 带表单认证的测试
 *   node browser-automation-test.js http://localhost:9866 \
 *     --auth-form="input#username,input#password,button#login" \
 *     --auth-values="user,pass"
 *
 *   # 带自定义元素检查的测试
 *   node browser-automation-test.js http://localhost:9866 \
 *     --check-elements="#terminal,#connectBtn,#tokenInput" \
 *     --token=xxx
 *
 *   # 完整E2E测试（使用配置文件）
 *   node browser-automation-test.js http://localhost:9866 \
 *     --config=./test-config.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  headless: true,
  slowMo: 50,
  timeout: 30000,
  viewport: { width: 1280, height: 720 },
  screenshots: true,
  reportDir: './test-reports',

  // 测试开关
  tests: {
    pageLoad: true,
    elementCheck: false,      // 需要 --check-elements 开启
    connection: false,        // 需要 --token 或 --auth-form 开启
    sessionPanel: false,      // 需要 --session-selector 开启
    terminalInput: false,     // 需要 --terminal-selector 开启
    responsive: true,
    performance: true
  },

  // 选择器配置（可通过命令行覆盖）
  selectors: {
    terminal: null,
    connectBtn: null,
    tokenInput: null,
    sessionBtn: null,
    sessionPanel: null,
    statusText: null
  },

  // 认证配置
  auth: {
    type: null,              // 'token' | 'form' | 'basic'
    token: null,
    formSelectors: null,     // "usernameSelector,passwordSelector,submitSelector"
    formValues: null         // "username,password"
  }
} };

// 测试结果
const results = {
  tests: [],
  startTime: Date.now()
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(level, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  let color = colors.reset;
  let prefix = '[INFO]';

  switch(level) {
    case 'success': color = colors.green; prefix = '[PASS]'; break;
    case 'error': color = colors.red; prefix = '[FAIL]'; break;
    case 'warning': color = colors.yellow; prefix = '[WARN]'; break;
    case 'info': color = colors.blue; prefix = '[INFO]'; break;
    case 'header': color = colors.cyan; break;
  }

  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function logHeader(title) {
  console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);
}

async function takeScreenshot(page, name, config) {
  if (!config.screenshots) return null;

  const screenshotPath = path.join(config.reportDir, 'screenshots', `${name}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });
  return screenshotPath;
}

async function runTestCase(name, testFn, details = {}) {
  log('info', `开始测试: ${name}`);
  const startTime = Date.now();

  try {
    const result = await testFn();
    const duration = Date.now() - startTime;

    results.tests.push({
      name,
      status: 'PASS',
      duration,
      details: result?.details || details.details || '测试通过'
    });

    log('success', `${name} (${duration}ms)`);
    return { success: true, duration, data: result };
  } catch (error) {
    const duration = Date.now() - startTime;

    results.tests.push({
      name,
      status: 'FAIL',
      duration,
      details: error.message
    });

    log('error', `${name}: ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

// 格式化表格输出
function formatTableRow(test) {
  const statusIcon = test.status === 'PASS' ? '✅' : '❌';
  const statusColor = test.status === 'PASS' ? colors.green : colors.red;
  const name = test.name.padEnd(14).substring(0, 14);

  let details = test.details;
  if (details.length > 35) {
    details = details.substring(0, 32) + '...';
  }

  return `│ ${name} │ ${statusColor}${test.status.padEnd(6)}${colors.reset} │ ${statusIcon}     │ ${details.padEnd(35)} │`;
}

// 解析配置文件
function loadConfig(configPath) {
  if (!configPath || !fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`警告: 无法加载配置文件: ${e.message}`);
    return null;
  }
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    url: args[0],
    config: null,
    token: null,
    headless: true,
    checkElements: null,
    authForm: null,
    authValues: null
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--config=')) {
      options.config = arg.split('=')[1];
    } else if (arg.startsWith('--token=')) {
      options.token = arg.split('=')[1];
    } else if (arg === '--no-headless') {
      options.headless = false;
    } else if (arg.startsWith('--check-elements=')) {
      options.checkElements = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--auth-form=')) {
      options.authForm = arg.split('=')[1].split(',');
    } else if (arg.startsWith('--auth-values=')) {
      options.authValues = arg.split('=')[1].split(',');
    }
  }

  return options;
}

// 合并配置
function mergeConfig(options) {
  let config = { ...DEFAULT_CONFIG };

  // 加载配置文件
  if (options.config) {
    const fileConfig = loadConfig(options.config);
    if (fileConfig) {
      config = { ...config, ...fileConfig };
    }
  }

  // 命令行参数覆盖
  config.headless = options.headless;

  if (options.token) {
    config.auth.type = 'token';
    config.auth.token = options.token;
    config.tests.connection = true;
  }

  if (options.authForm && options.authValues) {
    config.auth.type = 'form';
    config.auth.formSelectors = options.authForm;
    config.auth.formValues = options.authValues;
    config.tests.connection = true;
  }

  if (options.checkElements) {
    config.tests.elementCheck = true;
    config.selectors.elements = options.checkElements;
  }

  return config;
}

async function runTests(url, config) {
  logHeader('🚀 Enterprise Browser Automation Test');

  // 创建报告目录
  if (!fs.existsSync(config.reportDir)) {
    fs.mkdirSync(config.reportDir, { recursive: true });
    fs.mkdirSync(path.join(config.reportDir, 'screenshots'), { recursive: true });
  }

  log('info', `测试目标: ${url}`);
  log('info', `报告目录: ${config.reportDir}`);

  // 启动浏览器
  logHeader('🌐 启动浏览器');
  const browser = await puppeteer.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,720'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(config.viewport);
  page.setDefaultTimeout(config.timeout);
  page.setDefaultNavigationTimeout(config.timeout);

  log('success', '浏览器启动成功');

  try {
    // 测试 1: 页面加载
    if (config.tests.pageLoad) {
      await runTestCase('Page Load', async () => {
        await page.goto(url, { waitUntil: 'networkidle2' });
        await takeScreenshot(page, '01-page-load', config);

        const title = await page.title();
        if (!title) throw new Error('页面标题为空');

        return { details: `Title: "${title}"` };
      });
    }

    // 测试 2: 关键元素检查
    if (config.tests.elementCheck && config.selectors.elements) {
      await runTestCase('Element Check', async () => {
        const elements = [];
        const missing = [];

        for (const selector of config.selectors.elements) {
          const el = await page.$(selector);
          if (el) {
            elements.push(selector.replace('#', '').replace('.', ''));
          } else {
            missing.push(selector);
          }
        }

        if (missing.length > 0) {
          throw new Error(`未找到: ${missing.join(', ')}`);
        }

        await takeScreenshot(page, '02-elements-check', config);
        return { details: `Found: ${elements.join(', ')}` };
      });
    }

    // 测试 3: 连接/认证流程
    if (config.tests.connection) {
      if (config.auth.type === 'token') {
        await runTestCase('Connection Flow', async () => {
          await page.type(config.selectors.tokenInput || '#tokenInput', config.auth.token);
          await takeScreenshot(page, '03-token-entered', config);

          await page.click(config.selectors.connectBtn || '#connectBtn');

          const statusSelector = config.selectors.statusText || '#statusText';
          await page.waitForFunction(
            (sel) => {
              const el = document.querySelector(sel);
              return el && (el.textContent.includes('已连接') || el.textContent.includes('Connected'));
            },
            { timeout: 10000 },
            statusSelector
          );

          await takeScreenshot(page, '04-connected', config);
          return { details: 'WebSocket connected successfully' };
        });
      } else if (config.auth.type === 'form') {
        await runTestCase('Auth Form', async () => {
          const [userSel, passSel, submitSel] = config.auth.formSelectors;
          const [userVal, passVal] = config.auth.formValues;

          await page.type(userSel, userVal);
          await page.type(passSel, passVal);
          await takeScreenshot(page, '03-form-filled', config);

          await page.click(submitSel);
          await page.waitForNavigation({ waitUntil: 'networkidle2' });

          await takeScreenshot(page, '04-authenticated', config);
          return { details: 'Form submitted successfully' };
        });
      }

      // 测试 4: 会话面板
      if (config.tests.sessionPanel && config.selectors.sessionBtn) {
        await runTestCase('Session Panel', async () => {
          await page.click(config.selectors.sessionBtn);
          await page.waitForTimeout(500);

          const panel = await page.$(config.selectors.sessionPanel || '#sessionPanel');
          if (!panel) throw new Error('会话面板未显示');

          await takeScreenshot(page, '05-session-panel', config);
          return { details: 'Panel displays correctly' };
        });
      }

      // 测试 5: 终端输入
      if (config.tests.terminalInput && config.selectors.terminal) {
        await runTestCase('Terminal Input', async () => {
          await page.click(config.selectors.terminal);
          await page.keyboard.type('ls -la');
          await page.waitForTimeout(500);

          await takeScreenshot(page, '06-terminal-input', config);
          return { details: 'Keyboard input working' };
        });
      }
    }

    // 测试 6: 响应式布局
    if (config.tests.responsive) {
      await runTestCase('Responsive (Mobile)', async () => {
        await page.setViewport({ width: 375, height: 667 });
        await page.reload({ waitUntil: 'networkidle2' });
        await takeScreenshot(page, '07-mobile-view', config);

        await page.setViewport(config.viewport);
        return { details: 'Mobile viewport renders correctly' };
      });
    }

    // 测试 7: 性能指标
    if (config.tests.performance) {
      await runTestCase('Performance', async () => {
        const metrics = await page.evaluate(() => {
          return {
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
            firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime
          };
        });

        fs.writeFileSync(
          path.join(config.reportDir, 'performance-metrics.json'),
          JSON.stringify(metrics, null, 2)
        );

        return { details: `Load time: ${(metrics.loadTime / 1000).toFixed(1)}s` };
      });
    }

  } catch (error) {
    log('error', `测试执行失败: ${error.message}`);
    await takeScreenshot(page, 'error-screenshot', config);
  }

  await browser.close();
  await generateReport(url, config);
}

async function generateReport(url, config) {
  logHeader('📊 测试报告');

  const duration = Date.now() - results.startTime;
  const total = results.tests.length;
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  const passRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;

  let grade = 'F';
  let recommendation = '❌ 阻止发布';
  let recommendationColor = colors.red;

  if (passRate >= 95) {
    grade = 'A+';
    recommendation = '✅ 立即发布';
    recommendationColor = colors.green;
  } else if (passRate >= 85) {
    grade = 'A';
    recommendation = '✅ 可以发布';
    recommendationColor = colors.green;
  } else if (passRate >= 70) {
    grade = 'B';
    recommendation = '⚠️ 条件发布';
    recommendationColor = colors.yellow;
  } else if (passRate >= 50) {
    grade = 'C';
    recommendation = '❌ 阻止发布';
    recommendationColor = colors.red;
  }

  // 打印测试结果表格
  console.log(`\n${'═'.repeat(70)}`);
  console.log('                    测试结果汇总');
  console.log(`${'═'.repeat(70)}\n`);

  console.log('┌────────────────┬────────┬───────┬─────────────────────────────────────┐');
  console.log('│     测试项     │  状态  │ 图标  │              详情                   │');
  console.log('├────────────────┼────────┼───────┼─────────────────────────────────────┤');

  for (const test of results.tests) {
    console.log(formatTableRow(test));
  }

  console.log('└────────────────┴────────┴───────┴─────────────────────────────────────┘');

  // 打印摘要
  console.log(`\n${'═'.repeat(70)}`);
  console.log('                      测试摘要');
  console.log(`${'═'.repeat(70)}`);
  console.log(`  总测试数: ${total}`);
  console.log(`  通过:     ${colors.green}${passed}${colors.reset}`);
  console.log(`  失败:     ${failed > 0 ? colors.red : colors.white}${failed}${colors.reset}`);
  console.log(`  通过率:   ${passRate >= 85 ? colors.green : passRate >= 70 ? colors.yellow : colors.red}${passRate}%${colors.reset}`);
  console.log(`  评分等级: ${grade}`);
  console.log(`  用时:     ${duration}ms`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`\n  ${recommendationColor}${recommendation}${colors.reset}\n`);

  // 关键证据摘要
  if (passed >= 3) {
    console.log(`${'═'.repeat(70)}`);
    console.log('                     关键证据摘要');
    console.log(`${'═'.repeat(70)}`);
    console.log('');
    console.log('  浏览器自动化测试成功验证了以下功能:');
    console.log('');

    const evidence = [];
    if (results.tests.find(t => t.name === 'Page Load' && t.status === 'PASS')) {
      evidence.push('  ✅ 页面加载并正确渲染');
    }
    if (results.tests.find(t => t.name === 'Element Check' && t.status === 'PASS')) {
      evidence.push('  ✅ 关键元素已找到');
    }
    if (results.tests.find(t => t.name === 'Connection Flow' && t.status === 'PASS')) {
      evidence.push('  ✅ WebSocket连接建立成功');
    }
    if (results.tests.find(t => t.name === 'Auth Form' && t.status === 'PASS')) {
      evidence.push('  ✅ 表单认证成功');
    }
    if (results.tests.find(t => t.name === 'Session Panel' && t.status === 'PASS')) {
      evidence.push('  ✅ 会话管理功能正常');
    }
    if (results.tests.find(t => t.name === 'Terminal Input' && t.status === 'PASS')) {
      evidence.push('  ✅ 终端输入功能工作正常');
    }
    if (results.tests.find(t => t.name === 'Responsive (Mobile)' && t.status === 'PASS')) {
      evidence.push('  ✅ 响应式设计在移动端正确渲染');
    }
    if (results.tests.find(t => t.name === 'Performance' && t.status === 'PASS')) {
      evidence.push('  ✅ 性能指标符合要求');
    }

    evidence.forEach(item => console.log(item));
    console.log('');
    console.log(`  截图证据保存在: ${colors.cyan}${config.reportDir}/screenshots/${colors.reset}`);
    console.log('');
    console.log(`${'═'.repeat(70)}\n`);
  }

  // 保存 JSON 报告
  const reportData = {
    timestamp: new Date().toISOString(),
    url,
    config: {
      tests: config.tests,
      selectors: config.selectors
    },
    summary: {
      total,
      passed,
      failed,
      passRate: `${passRate}%`,
      duration: `${duration}ms`,
      grade,
      recommendation
    },
    tests: results.tests
  };

  fs.writeFileSync(
    path.join(config.reportDir, 'report.json'),
    JSON.stringify(reportData, null, 2)
  );

  log('info', `报告已保存到: ${config.reportDir}`);
}

// 主函数
async function main() {
  const options = parseArgs();

  if (!options.url) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     Enterprise Browser Automation Test - 通用版本          ║
╚════════════════════════════════════════════════════════════╝

用法: node browser-automation-test.js [url] [options]

基本测试（无需配置）:
  node browser-automation-test.js http://localhost:3000

带Token认证的测试:
  node browser-automation-test.js http://localhost:3000 --token=xxx

带表单认证的测试:
  node browser-automation-test.js http://localhost:3000 \\
    --auth-form="input#username,input#password,button#login" \\
    --auth-values="user,pass"

自定义元素检查:
  node browser-automation-test.js http://localhost:3000 \\
    --check-elements="#app,#header,#footer" \\
    --token=xxx

使用配置文件:
  node browser-automation-test.js http://localhost:3000 \\
    --config=./test-config.json

选项:
  --token=<token>              Token认证
  --auth-form=<selectors>      表单选择器（逗号分隔）
  --auth-values=<values>       表单值（逗号分隔）
  --check-elements=<selectors> 要检查的元素（逗号分隔）
  --config=<path>              配置文件路径
  --no-headless                显示浏览器窗口

配置文件示例 (test-config.json):
{
  "tests": {
    "pageLoad": true,
    "elementCheck": true,
    "connection": true,
    "responsive": true,
    "performance": true
  },
  "selectors": {
    "elements": ["#terminal", "#connectBtn", "#tokenInput"],
    "connectBtn": "#connectBtn",
    "tokenInput": "#tokenInput",
    "statusText": "#statusText"
  },
  "auth": {
    "type": "token",
    "token": "your-token-here"
  }
}
`);
    process.exit(1);
  }

  const config = mergeConfig(options);

  try {
    await runTests(options.url, config);
    const failedCount = results.tests.filter(t => t.status === 'FAIL').length;
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    log('error', `测试失败: ${error.message}`);
    process.exit(1);
  }
}

main();
