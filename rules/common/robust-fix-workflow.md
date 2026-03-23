# Robust Fix Workflow

> **MANDATORY** for all bug fixes and code modifications.
> This workflow prevents "fix one thing, break three others" syndrome.

## The Problem

AI tends to:
- Fix locally without considering global impact
- Skip edge case analysis
- Miss failure mode assessment
- Forget regression testing

## The Solution: Pre-Flight Checklist

**BEFORE modifying ANY code, you MUST complete these steps:**

---

### Step 1: Impact Analysis (MANDATORY)

Use GitNexus to analyze blast radius:

```bash
# For functions
mcp__gitnexus__impact({target: "functionName", direction: "upstream", maxDepth: 3})

# For classes
mcp__gitnexus__impact({target: "ClassName", direction: "upstream", maxDepth: 3})
```

**Report to user:**
- Direct callers (d=1) - WILL BREAK
- Indirect dependents (d=2) - LIKELY AFFECTED
- Risk level (LOW/MEDIUM/HIGH/CRITICAL)

**STOP if HIGH/CRITICAL risk** - escalate to user first.

---

### Step 2: Answer These 5 Questions (IN WRITING)

Document your answers before writing code:

```markdown
## Fix Analysis for: [bug description]

### 1. Root Cause
What caused the bug? Why did it happen?

### 2. Impact Scope
- Functions modified: [list]
- Direct callers affected: [list from impact analysis]
- API contracts changed: [yes/no, if yes describe]
- Database schema affected: [yes/no]

### 3. Edge Cases to Handle
- [ ] Null/empty inputs
- [ ] Maximum values (overflow)
- [ ] Concurrent access (if applicable)
- [ ] Backward compatibility
- [ ] Error states

### 4. Failure Modes
If this fix fails or introduces new bugs:
- What's the worst case?
- How will we detect it?
- Can we rollback?

### 5. Testing Strategy
- [ ] Unit test for the fix
- [ ] Regression test to prevent recurrence
- [ ] Integration test (if cross-module)
- [ ] Edge case tests
```

---

### Step 3: Multi-Perspective Review

For non-trivial fixes, launch parallel agents:

| Agent | Focus | Trigger |
|-------|-------|---------|
| **code-reviewer** | Correctness, edge cases | ALL fixes |
| **security-reviewer** | Security implications | Input handling, auth changes |
| **typescript-reviewer** (or language-specific) | Idiomatic code | Type changes |
| **tdd-guide** | Test coverage | ALL fixes |

**Parallel execution:**
```
Launch 3-4 agents simultaneously with different review focus
```

---

### Step 4: Implement with Defensive Patterns

**Required patterns:**

1. **Fail Fast** - Validate inputs immediately
2. **Explicit Error Handling** - No silent failures
3. **Immutable Updates** - Don't mutate shared state
4. **Logging** - Log state changes at appropriate levels
5. **Backward Compatibility** - Don't break existing callers

---

### Step 5: Regression Verification

Before marking complete:

```bash
# Run impact analysis again to verify scope
mcp__gitnexus__detect_changes({scope: "all"})

# Verify tests pass
# Run the full test suite for affected modules
```

**Checklist:**
- [ ] Original bug is fixed (repro test passes)
- [ ] No new warnings/errors introduced
- [ ] All d=1 dependents still work
- [ ] Performance not degraded

---

## Quick Reference: Fix Severity Levels

| Severity | Workflow Required |
|----------|-------------------|
| **Critical** (data loss, security) | Full workflow + architect review |
| **High** (feature broken) | Full workflow + multi-perspective review |
| **Medium** (edge case bug) | Impact analysis + code-reviewer + tdd-guide |
| **Low** (typo, formatting) | Standard code-reviewer |

---

## Red Flags (STOP and Escalate)

- Impact analysis shows >5 direct callers affected
- API signature changes without backward compatibility
- Database schema modifications
- Changes to authentication/authorization logic
- Critical path performance changes

**Action:** Present analysis to user, get approval before proceeding.

---

## Integration with Existing Workflows

This workflow **extends** [development-workflow.md](./development-workflow.md):

```
Standard Development:  Plan → TDD → Code Review → Commit
Robust Fix Workflow:   Impact Analysis → Questions → Multi-Review → Implement → Regression
```

**For bug fixes:** Use Robust Fix Workflow **instead of** standard development workflow.
**For new features:** Use standard development workflow.

---

## Pre-Tool Use Hook

When using Edit/Write tools for fixes, Claude Code MUST:

1. Check if impact analysis was done
2. If not, RUN IT FIRST
3. Display risk level to user
4. Wait for confirmation on HIGH/CRITICAL

**Hook behavior:**
- LOW/MEDIUM risk: Continue with warning
- HIGH/CRITICAL risk: Pause, require explicit user confirmation
