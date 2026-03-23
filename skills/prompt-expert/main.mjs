#!/usr/bin/env node

/**
 * Prompt Expert - 智能提示词专家主入口
 *
 * 功能：
 * 1. 分析当前对话上下文
 * 2. 识别用户意图和场景
 * 3. 生成最优提示词建议
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// 配置
const CONFIG = {
  outputDir: join(__dirname, 'output/suggestions'),
  contextFile: '/home/throokie/.claude/projects/-home-throokie/current-context.md',
  projectContextFile: '/home/throokie/.claude/projects/-home-throokie/project-context.md',
  templateLibrary: join(__dirname, 'scripts/template-library.md'),
  scenariosFile: join(__dirname, 'config/scenarios.json')
};

// 场景定义
const SCENARIOS = {
  'bug-fix': {
    signals: ['报错', 'error', 'failed', '不工作', 'bug', '异常', '崩溃', 'fix'],
    keywords: ['修复', '调试', '排查', '诊断'],
    template: 'bug-fix'
  },
  'feature-implementation': {
    signals: ['实现', '添加', 'create', 'build', '新功能', 'feature', 'add'],
    keywords: ['开发', '功能', '模块'],
    template: 'feature'
  },
  'research-exploration': {
    signals: ['怎么', '如何', 'how to', '了解', '学习', '原理', 'what is'],
    keywords: ['研究', '探索', '调查'],
    template: 'research'
  },
  'code-review': {
    signals: ['review', '审查', '检查', 'audit', 'code quality'],
    keywords: ['代码质量', '安全检查'],
    template: 'review'
  },
  'performance-optimization': {
    signals: ['优化', 'performance', 'slow', '慢', '加速'],
    keywords: ['性能', '速度', '效率'],
    template: 'performance'
  },
  'documentation': {
    signals: ['文档', 'doc', 'readme', '注释', 'comment'],
    keywords: ['说明', '文档化'],
    template: 'docs'
  },
  'project-start': {
    signals: ['新项目', 'new project', '初始化', '从零开始'],
    keywords: ['启动', '开始', '脚手架'],
    template: 'project-start'
  },
  'blocked-stuck': {
    signals: ['卡住', 'stuck', 'blocked', '实现不了', '不会'],
    keywords: ['困难', '阻碍', '挫折'],
    template: 'unblock'
  }
};

// 提示词模板库
const PROMPT_TEMPLATES = {
  'bug-fix': `
你正在调试一个问题。请按以下步骤进行：

**问题描述**:
{problemDescription}

**当前上下文**:
- 项目类型：{projectType}
- 技术栈：{techStack}
- 错误信息：{errorMessage}
- 复现步骤：{reproSteps}

**诊断流程**:
1. **确认现象**: 描述问题的具体表现
2. **定位范围**: 确定问题可能出现的模块
3. **假设驱动**: 提出 3 个最可能的原因
4. **逐一验证**: 设计实验验证每个假设
5. **修复方案**: 给出修复代码和验证方法

**期望输出**:
- 根本原因分析
- 修复方案（含代码）
- 验证步骤
- 预防措施
`,

  'feature': `
你正在实现一个新功能。请按以下流程进行：

**功能需求**:
{featureDescription}

**技术要求**:
- 遵循项目的代码规范
- 参考类似功能的实现模式
- 保证 80%+ 测试覆盖率
- 考虑错误处理和边界情况

**工作流程**:
1. **需求澄清**: 确认功能的具体需求和边界
2. **设计先行**: 先设计接口/组件结构
3. **测试驱动**: 先写测试，再实现功能
4. **代码审查**: 完成后自查代码质量
5. **验证部署**: 确保功能正常工作

**验收标准**:
- [ ] 所有测试通过
- [ ] 代码符合项目规范
- [ ] 文档已更新
- [ ] 无安全漏洞
`,

  'research': `
你正在探索一个新技术/概念。请按以下方式进行：

**探索主题**:
{topic}

**学习路径**:
1. **背景介绍**: 这是什么？为什么重要？
2. **核心概念**: 关键术语和概念解释
3. **实践示例**: 最小可运行的代码示例
4. **最佳实践**: 业界推荐的使用方式
5. **常见陷阱**: 容易犯的错误和如何避免

**输出要求**:
- 概念解释（适合 {experienceLevel} 水平）
- 代码示例（可运行）
- 学习资源推荐（入门/深入/实战）
- 下一步行动建议
`,

  'review': `
你正在进行代码审查。请按以下维度检查：

**审查范围**:
{reviewScope}

**检查清单**:
1. **代码质量** (25 分)
   - [ ] 命名清晰
   - [ ] 函数职责单一
   - [ ] 无重复代码
   - [ ] 适当的错误处理

2. **安全性** (25 分)
   - [ ] 输入验证
   - [ ] 无硬编码密钥
   - [ ] SQL 注入防护
   - [ ] XSS 防护

3. **性能** (25 分)
   - [ ] 无 N+1 查询
   - [ ] 适当的缓存策略
   - [ ] 资源正确释放

4. **可维护性** (25 分)
   - [ ] 测试覆盖
   - [ ] 文档完整
   - [ ] 日志适当

**问题分级**:
- 🔴 CRITICAL: 必须修复
- 🟠 HIGH: 应该修复
- 🟡 MEDIUM: 建议修复
- 🟢 LOW: 可选优化
`,

  'performance': `
你正在优化系统性能。请按以下流程进行：

**优化目标**:
{performanceGoal}

**当前状态**:
- 基准性能：{baselineMetrics}
- 目标性能：{targetMetrics}
- 瓶颈猜测：{bottleneckHypothesis}

**优化流程**:
1. **测量基准**: 建立性能基线
2. **定位瓶颈**: 使用 profiling 工具
3. **制定方案**: 列出所有可行方案
4. **优先级排序**: 按影响/成本比排序
5. **实施验证**: 逐个实施并测量效果

**输出要求**:
- 性能分析报告
- 优化方案列表（按优先级）
- 实施步骤
- 验证方法
`,

  'docs': `
你正在编写技术文档。请按以下结构进行：

**文档类型**:
{docType}

**目标读者**:
{targetAudience}

**文档结构**:
1. **概述**: 这是什么，解决什么问题
2. **快速开始**: 5 分钟上手指南
3. **详细指南**: 完整的使用说明
4. **API 参考**: 接口文档（如适用）
5. **最佳实践**: 推荐的使用方式
6. **常见问题**: FAQ
7. **故障排查**: 常见问题解决方法

**写作原则**:
- 简洁明确，避免歧义
- 代码示例可运行
- 截图/图表辅助说明
- 考虑不同水平的读者
`,

  'project-start': `
你正在启动一个新项目。让我们建立一个坚实的基础：

**项目目标**:
{projectGoal}

**启动清单**:
1. **技术选型**: 根据需求选择合适的技术栈
2. **项目脚手架**: 创建标准目录结构
3. **开发环境**: 配置 lint、test、debug 工具
4. **文档框架**: 建立 README、贡献指南
5. **CI/CD**: 设置基础自动化流程

**推荐结构**:
{recommendedStructure}

**下一步行动**:
- [ ] 确认技术栈
- [ ] 创建项目骨架
- [ ] 配置开发工具
- [ ] 编写第一个测试
`,

  'unblock': `
你遇到了一个实现障碍。让我们系统性地诊断问题：

**当前状态**:
- 已完成：{completedParts}
- 阻塞点：{blockingPoint}
- 已尝试：{attemptedSolutions}
- 期望行为：{expectedBehavior}
- 实际行为：{actualBehavior}

**诊断流程**:
1. **重新定义问题**: 用不同方式描述阻塞点
2. **拆解问题**: 把大问题拆成可管理的小步骤
3. **寻求替代**: 是否有其他方式达到同样目标？
4. **外部视角**: 参考类似项目的解决方案
5. **最小复现**: 创建最小复现示例

**下一步**:
请告诉我具体卡在哪个步骤，以及更多上下文信息。
`
};

/**
 * 解析命令行参数
 */
function parseArgs(args) {
  const options = {
    query: '',
    context: false,
    deep: false,
    scenario: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--context') options.context = true;
    else if (arg === '--deep') options.deep = true;
    else if (arg === '--scenario' && args[i + 1]) options.scenario = args[++i];
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (!arg.startsWith('-')) options.query = arg;
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
Prompt Expert - 智能提示词专家

用法:
  node main.mjs [选项] "你的需求"

选项:
  --context     带上下文分析（读取当前对话和项目状态）
  --deep        深度分析（多模型并行）
  --scenario    指定场景类型 (bug-fix|feature|research|review|performance|docs|project-start|unblock)
  --help, -h    显示帮助信息

示例:
  node main.mjs "如何实现用户登录"
  node main.mjs --context "优化数据库查询性能"
  node main.mjs --deep --scenario bug-fix "API 返回 500 错误"
  node main.mjs --scenario project-start "创建新的微服务项目"
`);
}

/**
 * 检测场景类型
 */
function detectScenario(query, context = null) {
  const lowerQuery = query.toLowerCase();

  // 基于关键词匹配
  let bestMatch = null;
  let bestScore = 0;

  for (const [scenario, config] of Object.entries(SCENARIOS)) {
    let score = 0;

    // 检查信号词
    for (const signal of config.signals) {
      if (lowerQuery.includes(signal.toLowerCase())) {
        score += 3;
      }
    }

    // 检查关键词
    for (const keyword of config.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }

    // 特殊场景：超时、连接问题归类为 bug-fix
    if (scenario === 'bug-fix') {
      if (lowerQuery.includes('timeout') || lowerQuery.includes('超时') ||
          lowerQuery.includes('connection') || lowerQuery.includes('连接') ||
          lowerQuery.includes('error') || lowerQuery.includes('错误') ||
          lowerQuery.includes('failed') || lowerQuery.includes('失败')) {
        score += 5;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = scenario;
    }
  }

  console.log(`[DEBUG] 场景检测：${bestMatch} (分数：${bestScore})`);

  // 如果分数太低，返回通用场景
  if (bestScore < 3) {
    return 'general';
  }

  return bestMatch;
}

/**
 * 读取项目上下文
 */
async function readProjectContext() {
  const context = {
    projectType: 'unknown',
    techStack: [],
    currentTask: '',
    recentChanges: []
  };

  // 尝试读取项目上下文文件
  if (existsSync(CONFIG.projectContextFile)) {
    try {
      const content = await readFile(CONFIG.projectContextFile, 'utf-8');
      // 解析项目信息
      const techStackMatch = content.match(/techStack:\s*\[([^\]]+)\]/);
      if (techStackMatch) {
        context.techStack = techStackMatch[1].split(',').map(s => s.trim());
      }
      const projectTypeMatch = content.match(/projectType:\s*(\w+)/);
      if (projectTypeMatch) {
        context.projectType = projectTypeMatch[1];
      }
    } catch (e) {
      console.error('读取项目上下文失败:', e.message);
    }
  }

  // 检测项目类型（通过 package.json 等）
  const projectFiles = [
    { file: 'package.json', type: 'nodejs', tech: ['Node.js', 'JavaScript'] },
    { file: 'go.mod', type: 'golang', tech: ['Go'] },
    { file: 'pyproject.toml', type: 'python', tech: ['Python'] },
    { file: 'requirements.txt', type: 'python', tech: ['Python'] },
    { file: 'Cargo.toml', type: 'rust', tech: ['Rust'] },
    { file: 'pom.xml', type: 'java', tech: ['Java', 'Maven'] },
    { file: 'build.gradle', type: 'java', tech: ['Java', 'Gradle'] }
  ];

  const cwd = process.cwd();
  for (const { file, type, tech } of projectFiles) {
    const filePath = join(cwd, file);
    if (existsSync(filePath)) {
      context.projectType = type;
      context.techStack.push(...tech);
      break;
    }
  }

  return context;
}

/**
 * 生成提示词
 */
function generatePrompt(templateName, variables) {
  let template = PROMPT_TEMPLATES[templateName];

  if (!template) {
    // 使用通用模板
    template = `
请帮我解决这个问题：

**问题描述**:
{query}

**上下文**:
- 项目类型：{projectType}
- 技术栈：{techStack}

**期望输出**:
- 清晰的解决步骤
- 代码示例（如适用）
- 验证方法
`;
  }

  // 填充变量
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    if (Array.isArray(value)) {
      result = result.replace(new RegExp(placeholder, 'g'), value.join(', '));
    } else {
      result = result.replace(new RegExp(placeholder, 'g'), value || '未指定');
    }
  }

  return result.trim();
}

/**
 * 生成提示词建议
 */
async function generateSuggestion(query, options) {
  // 读取项目上下文
  const projectContext = await readProjectContext();

  // 检测场景
  const scenario = options.scenario || detectScenario(query);

  // 获取场景配置
  const scenarioConfig = SCENARIOS[scenario];

  // 从查询中提取信息（简单启发式）
  const extractedVars = extractVariables(query, scenario);

  // 生成提示词
  const variables = {
    query,
    projectType: projectContext.projectType,
    techStack: projectContext.techStack.join(', ') || '未检测到',
    experienceLevel: '中级',
    problemDescription: extractedVars.problemDescription || query,
    errorMessage: extractedVars.errorMessage || '待补充',
    reproSteps: extractedVars.reproSteps || '待补充',
    featureDescription: extractedVars.featureDescription || query,
    performanceGoal: extractedVars.performanceGoal || query,
    topic: extractedVars.topic || query,
    reviewScope: extractedVars.reviewScope || query,
    docType: extractedVars.docType || '技术文档',
    targetAudience: extractedVars.targetAudience || '开发者',
    projectGoal: extractedVars.projectGoal || query,
    completedParts: extractedVars.completedParts || '待说明',
    blockingPoint: extractedVars.blockingPoint || query,
    attemptedSolutions: extractedVars.attemptedSolutions || '待说明',
    expectedBehavior: extractedVars.expectedBehavior || '待说明',
    actualBehavior: extractedVars.actualBehavior || query,
    ...options.variables
  };

  const templateName = scenarioConfig?.template || scenario;
  const prompt = generatePrompt(templateName, variables);

  // 生成建议对象
  const suggestion = {
    timestamp: new Date().toISOString(),
    scenario,
    projectContext,
    originalQuery: query,
    generatedPrompt: prompt,
    usageTips: getUsageTips(scenario)
  };

  // 保存到文件
  await saveSuggestion(suggestion);

  return suggestion;
}

/**
 * 从查询中提取变量（简单启发式）
 */
function extractVariables(query, scenario) {
  const vars = {};

  // 错误信息提取（匹配引号、冒号后的内容）
  const errorPatterns = [
    /错误 [：:]\s*["']?([^"'\n]+)["']?/i,
    /error[：:\s]+["']?([^"'\n]+)["']?/i,
    /异常 [：:]\s*["']?([^"'\n]+)["']?/i,
    /exception[：:\s]+["']?([^"'\n]+)["']?/i,
    /Failed[：:\s]+["']?([^"'\n]+)["']?/i
  ];

  for (const pattern of errorPatterns) {
    const match = query.match(pattern);
    if (match) {
      vars.errorMessage = match[1].trim();
      break;
    }
  }

  // 如果没有明确错误信息，尝试提取最后一部分作为问题描述
  if (!vars.errorMessage) {
    vars.problemDescription = query;
  } else {
    vars.problemDescription = query.split(/错误 |error|异常/i)[0].trim() || query;
  }

  return vars;
}

/**
 * 获取使用建议
 */
function getUsageTips(scenario) {
  const tips = {
    'bug-fix': [
      '提供完整的错误信息和堆栈跟踪',
      '说明复现步骤',
      '告知已尝试的解决方案'
    ],
    'feature': [
      '先明确功能边界和验收标准',
      '参考项目中类似功能的实现',
      '考虑测试覆盖率要求'
    ],
    'research': [
      '说明你的当前水平',
      '告知学习时间预算',
      '指定偏好的学习方式（文档/视频/实战）'
    ],
    'review': [
      '指定审查范围（单个文件/整个模块）',
      '告知关注的重点（安全/性能/规范）',
      '提供相关背景信息'
    ],
    'performance': [
      '提供当前性能指标',
      '说明性能目标',
      '告知可接受的改动范围'
    ],
    'docs': [
      '明确目标读者',
      '说明文档用途',
      '提供必要的技术细节'
    ],
    'project-start': [
      '描述项目目标',
      '告知团队规模和技术偏好',
      '考虑未来的扩展需求'
    ],
    'unblock': [
      '详细描述阻塞点',
      '列出已尝试的方法',
      '说明期望 vs 实际的差异'
    ]
  };

  return tips[scenario] || ['尽量提供详细的上下文信息'];
}

/**
 * 保存建议到文件
 */
async function saveSuggestion(suggestion) {
  // 确保输出目录存在
  if (!existsSync(CONFIG.outputDir)) {
    await mkdir(CONFIG.outputDir, { recursive: true });
  }

  // 生成文件名
  const timestamp = suggestion.timestamp.replace(/[:.]/g, '-');
  const filename = `suggestion-${timestamp}.md`;
  const filepath = join(CONFIG.outputDir, filename);

  // 生成 Markdown 内容
  const content = `# 提示词建议

**生成时间**: ${suggestion.timestamp}
**场景类型**: ${suggestion.scenario}
**原始查询**: ${suggestion.originalQuery}

---

## 项目上下文

- **项目类型**: ${suggestion.projectContext.projectType}
- **技术栈**: ${suggestion.projectContext.techStack.join(', ')}

---

## 生成的提示词

\`\`\`
${suggestion.generatedPrompt}
\`\`\`

---

## 使用建议

${suggestion.usageTips.map(tip => `- ${tip}`).join('\n')}

---

## 下一步

1. 复制上面的提示词
2. 粘贴到新的对话中
3. 根据实际需要调整细节
`;

  await writeFile(filepath, content);
  console.log(`建议已保存：${filepath}`);
}

/**
 * 格式化输出
 */
function formatOutput(suggestion) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 Prompt Expert - 提示词建议');
  console.log('='.repeat(60));
  console.log(`\n📍 场景类型：${suggestion.scenario}`);
  console.log(`📁 项目类型：${suggestion.projectContext.projectType}`);
  console.log(`🛠️ 技术栈：${suggestion.projectContext.techStack.join(', ') || '未检测到'}`);
  console.log('\n' + '-'.repeat(60));
  console.log('📝 生成的提示词:\n');
  console.log(suggestion.generatedPrompt);
  console.log('-'.repeat(60));
  console.log('\n💡 使用建议:');
  suggestion.usageTips.forEach((tip, i) => {
    console.log(`  ${i + 1}. ${tip}`);
  });
  console.log('\n' + '='.repeat(60));
  console.log(`完整建议已保存：${CONFIG.outputDir}/suggestion-*.md`);
  console.log('='.repeat(60) + '\n');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.query) {
    console.error('错误：请提供查询内容');
    console.error('使用 --help 查看用法');
    process.exit(1);
  }

  try {
    const suggestion = await generateSuggestion(options.query, options);
    formatOutput(suggestion);
  } catch (error) {
    console.error('生成提示词失败:', error.message);
    process.exit(1);
  }
}

// 运行
main();
