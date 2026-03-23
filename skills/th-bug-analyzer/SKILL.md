---
name: th-bug-analyzer
description: Analyze bug impact scope and code relationships using GitNexus. Supports Playwright integration for frontend/UI bug analysis with visual testing and cross-browser verification. Use this skill when the user mentions finding bug impact, analyzing code dependencies, checking blast radius of changes, understanding what code is affected by a bug, investigating relationships between code components, or analyzing frontend/UI/E2E test failures.
---

# Bug Impact Analyzer

A skill for analyzing bug impact scope and code relationships using GitNexus knowledge graph.

## When to Use

- User provides a bug description and wants to know impact scope
- Need to analyze code dependencies before fixing a bug
- Want to understand blast radius of code changes
- Investigating relationships between components
- Assessing risk before refactoring

## Core Workflow

### Step 1: Parse User Input

Extract the following from user's request:
- **Target**: Function name, class name, file path, or code snippet with the bug
- **Direction**: `upstream` (what depends on this) or `downstream` (what this depends on)
- **Depth**: How many levels deep to analyze (default: 3)
- **Context**: Any additional bug description or error message

### Step 2: Multi-Dimensional Analysis

Run these GitNexus queries in parallel when possible:

#### 2.1 Impact Analysis (Primary)
```javascript
mcp__gitnexus__impact({
  target: "<function_or_class_name>",
  direction: "upstream",  // or "downstream"
  maxDepth: 3,
  includeTests: true  // include test files in analysis
})
```

#### 2.2 Context Analysis (For detailed symbol info)
```javascript
mcp__gitnexus__context({
  name: "<symbol_name>",
  include_content: true
})
```

#### 2.3 Execution Flow Query (For process tracing)
```javascript
mcp__gitnexus__query({
  query: "<function_name> execution flow",
  goal: "understand how this function is called and what it affects",
  task_context: "analyzing bug impact",
  limit: 5
})
```

#### 2.4 Change Detection (If user has uncommitted changes)
```javascript
mcp__gitnexus__detect_changes({
  scope: "unstaged"  // or "staged", "all", "compare"
})
```

### Step 3: Analyze Results

Process the GitNexus results to extract:

**From Impact Analysis:**
- Direct callers (d=1) - WILL BREAK if modified
- Indirect dependents (d=2) - LIKELY AFFECTED
- Transitive dependents (d=3) - MAY NEED TESTING
- Risk level (LOW/MEDIUM/HIGH/CRITICAL)

**From Context Analysis:**
- All callers and callees
- Properties accessed
- Methods that override this
- Process participation

**From Query Results:**
- Execution flows involving the target
- Related processes and entry points
- Standalone definitions

### Step 4: Generate Impact Report

Structure the report as follows:

```markdown
# Bug Impact Analysis: [Target Name]

## Executive Summary
- **Target**: [function/class/file]
- **Risk Level**: [LOW/MEDIUM/HIGH/CRITICAL]
- **Total Affected Symbols**: [count]
- **Direct Dependencies**: [count]
- **Indirect Dependencies**: [count]

## Impact Breakdown by Depth

### Direct Impact (d=1) - [N] symbols
These WILL BREAK if the target changes:
| Symbol | Type | File | Relationship |
|--------|------|------|--------------|
| ...    | ...  | ...  | Calls target |

### Indirect Impact (d=2) - [N] symbols
These are LIKELY AFFECTED:
| Symbol | Type | File | Relationship |
|--------|------|------|--------------|
| ...    | ...  | ...  | Calls d=1 symbol |

### Transitive Impact (d=3) - [N] symbols
These MAY NEED TESTING:
| Symbol | Type | File | Relationship |
|--------|------|------|--------------|
| ...    | ...  | ...  | Calls d=2 symbol |

## Affected Execution Flows
[List of processes/flows that involve the target]

## Critical Paths
[Highlight high-risk dependency chains]

## Recommendations
1. **Immediate Actions**: [What to check first]
2. **Testing Strategy**: [What to test]
3. **Rollback Plan**: [How to revert if needed]
```

## Playwright Integration for Frontend/UI Bug Analysis

When analyzing frontend/UI-related bugs, use Playwright to capture visual evidence and reproduce issues:

### When to Use Playwright

- **UI Rendering Issues**: Elements not displaying correctly, layout broken
- **E2E Test Failures**: Playwright/Cypress/Selenium tests failing
- **Visual Regression**: UI looks different from expected
- **Interactive Bugs**: Click/hover events not working
- **Cross-browser Issues**: Bug only occurs in specific browsers

### Playwright Analysis Workflow

#### Step 1: Capture Current State
```bash
# Screenshot the problematic page
playwright screenshot --full-page --viewport-size="1280,720" <url> /tmp/bug-current.png

# Screenshot with mobile viewport
playwright screenshot --viewport-size="375,667" --device="iPhone 12" <url> /tmp/bug-mobile.png
```

#### Step 2: Multi-browser Testing
```bash
# Test in different browsers to check cross-browser compatibility
playwright screenshot -b chromium <url> /tmp/bug-chromium.png
playwright screenshot -b firefox <url> /tmp/bug-firefox.png
playwright screenshot -b webkit <url> /tmp/bug-webkit.png
```

#### Step 3: Generate Reproduction Script
```bash
# Use codegen to create a script that reproduces the bug
playwright codegen <url>
# Then modify the generated script to replicate the exact bug conditions
```

#### Step 4: Visual Comparison (if baseline exists)
```bash
# Compare current state with expected baseline
# Use image diff tools if available
compare /tmp/bug-current.png /tmp/bug-baseline.png /tmp/bug-diff.png
```

### Frontend Bug Analysis Template

When reporting a frontend bug, include:

```markdown
## Frontend Bug Analysis: [Bug Description]

### Visual Evidence
- **Screenshot**: ![Current State](/tmp/bug-current.png)
- **Expected**: ![Expected State](/tmp/bug-baseline.png) (if available)
- **Diff**: ![Difference](/tmp/bug-diff.png) (if available)

### Environment
- **Browser**: [chromium/firefox/webkit]
- **Viewport**: [e.g., 1280x720, 375x667]
- **Color Scheme**: [light/dark]
- **URL**: [page URL]

### Reproduction Steps
1. Navigate to: `<url>`
2. [Step-by-step actions]
3. Observe: [Expected vs Actual behavior]

### Code Impact (from GitNexus)
[Standard impact analysis for frontend components]

### Recommended Fix
[Specific recommendations based on visual analysis]
```

### Special Frontend Cases

#### If E2E Test is Failing
1. Run the failing test with tracing:
   ```bash
   playwright test --trace on
   playwright show-trace test-results/trace.zip
   ```
2. Capture screenshot at failure point
3. Analyze the trace to understand timing/async issues

#### If Visual Regression Detected
1. Capture screenshots before/after
2. Check if CSS/styling files were modified (use GitNexus on CSS classes)
3. Analyze component tree changes

#### If Bug is Intermittent
1. Run Playwright multiple times with `--repeat-each=5`
2. Capture screenshots on each run
3. Compare to identify race conditions or timing issues

---

## Special Cases

### If Target Not Found in GitNexus
1. Use Grep to search for the function/class name
2. Try different naming conventions (camelCase vs snake_case)
3. Check if the file is indexed by GitNexus
4. Fall back to manual code review with user guidance

### If Impact is CRITICAL (>20 direct callers)
- **STOP and escalate to user**
- Present the analysis so far
- Ask for confirmation before proceeding with any changes
- Suggest incremental approach or feature flag

### If Target is a Class
- Run context analysis on the class
- Also analyze impact for critical methods
- Check inheritance relationships
- Look for polymorphic calls

### If Target is a Database Schema Element
- Use Cypher query to find all accessors:
```javascript
mcp__gitnexus__cypher({
  query: `MATCH (f:Function)-[r:CodeRelation {type: 'ACCESSES'}]->(p:Property)
          WHERE p.name = "<field_name>"
          RETURN f.name, f.filePath, r.reason`
})
```

## Example Usage

**User Input**: "I think there's a bug in the `validateUser` function, what's the impact?"

**Skill Execution**:
1. Extract target: "validateUser"
2. Run impact analysis with direction="upstream", maxDepth=3
3. Run context analysis for validateUser
4. Query execution flows for validateUser
5. Generate comprehensive report

**Output**: Detailed impact report showing all callers, affected flows, and risk assessment.

## Integration with Fix Workflow

This skill is designed to be the **first step** in the robust-fix-workflow:

1. **This Skill**: Analyze impact and generate report
2. **Next Steps**: User reviews report, decides on fix approach
3. **Then**: Use code-reviewer, security-reviewer, tdd-guide agents for fix implementation

## Tips for Best Results

- Always include test files in analysis (includeTests: true)
- Check both upstream and downstream dependencies when uncertain
- For classes, analyze both the class itself and its critical methods
- Pay attention to "process participation" - these are important execution flows
- When risk is HIGH or CRITICAL, always get user confirmation before proceeding
