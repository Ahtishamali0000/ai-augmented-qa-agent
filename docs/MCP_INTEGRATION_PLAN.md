# MCP Integration Plan for AI-Augmented QA Agent

## Executive Summary

The AI-Augmented QA Agent currently works well as an MVP using direct integrations with Jira, local JSON ticket data, Playwright services, generated pending scripts, and human approval before framework insertion.

Model Context Protocol, or MCP, should be treated as a future scalability and interoperability layer, not a Day-1 requirement. The project should first keep the current Jira and Playwright flow stable. MCP becomes valuable when the QA Agent needs to safely connect multiple external systems such as Jira, GitHub, Playwright, TestRail, Xray, Slack, and Teams through a consistent tool interface.

Recommended approach:

```text
Phase 1: Keep current direct Jira + Playwright MVP stable.
Phase 2: Add internal tool abstraction interfaces.
Phase 3: Convert Jira capabilities into MCP tools.
Phase 4: Convert Playwright execution/reporting into MCP tools.
Phase 5: Add GitHub branch/PR workflow through MCP.
Phase 6: Build a full agentic QA assistant using governed MCP tools.
```

The most important rule remains unchanged: AI can suggest, analyze, and generate pending artifacts, but humans must approve framework changes, commits, pull requests, and ticket transitions.

## Simple Explanation: What MCP Is

MCP is a standard way for an AI agent to talk to external tools.

In simple words:

```text
MCP is like a universal adapter between an AI assistant and real engineering systems.
```

Without MCP, every AI assistant needs custom code for Jira, GitHub, Playwright, Slack, TestRail, and other tools.

With MCP, each tool exposes capabilities in a standard format:

```text
AI Agent <--> MCP <--> Jira
AI Agent <--> MCP <--> GitHub
AI Agent <--> MCP <--> Playwright
AI Agent <--> MCP <--> TestRail/Xray
AI Agent <--> MCP <--> Slack/Teams
```

The AI does not need to know every API detail. It asks an MCP tool to perform a clearly defined operation, such as `getTicketDetails`, `runTestsByTag`, or `createPullRequest`.

## Why MCP Is Useful for This QA Agent

MCP is useful because this project is not only a UI app. It is becoming an AI-powered QA workflow system.

The QA Agent needs to interact with many tools:

- Jira for tickets, comments, status, acceptance criteria, and QA notes.
- Playwright for test inventory, execution, traces, reports, and coverage mapping.
- GitHub for repository files, branches, commits, pull requests, Actions, and code review.
- TestRail or Xray for manual test case storage and traceability.
- Slack or Teams for notifications, approvals, and QA summaries.

MCP gives the project a clean way to expose these capabilities to AI clients without tightly coupling the AI logic to each vendor API.

## Problem MCP Solves Compared to Normal API Integration

Direct API integration is good for the MVP. It is simple and easy to debug.

However, as the project grows, direct API integration can become hard to manage:

- Each external tool has different auth, rate limits, payload formats, errors, and permissions.
- AI prompts become mixed with low-level API details.
- Reusing the same tool logic across different AI clients is difficult.
- Governance becomes harder when AI can call many APIs directly.
- Auditing AI tool usage becomes inconsistent.

MCP solves this by creating a tool boundary:

```text
AI Agent -> MCP Tool Contract -> External System
```

The AI sees safe tool names and schemas. The implementation handles API details internally.

## Where MCP Fits in the Current Architecture

Current MVP flow:

```text
Jira Ticket or local JSON
  -> AI Requirement Analysis
  -> QA Test Strategy
  -> Manual Test Case Generation
  -> Existing Playwright Coverage Check
  -> Suggested Playwright Script
  -> Human Approval
  -> Add script to Playwright framework
  -> Run Playwright tests
  -> Generate QA summary
```

Future MCP-enabled flow:

```text
AI Agent
  -> MCP Tool Layer
    -> Jira MCP Server
    -> Playwright MCP Server
    -> GitHub MCP Server
    -> Test Case MCP Server
    -> Reporting MCP Server
  -> Human Approval Gate
  -> Framework / PR / Jira Update
```

MCP should sit between the AI reasoning layer and external systems. It should not replace the core QA domain logic immediately.

## Text Architecture Diagram

```text
+-------------------------------------------------------------+
|                    AI-Augmented QA Agent                    |
|-------------------------------------------------------------|
| React UI                                                    |
| - Jira Ticket QA Assistant                                  |
| - Manual Test Case Viewer                                   |
| - Coverage Gap Viewer                                       |
| - Script Preview + Human Approval                           |
| - Playwright Runner                                         |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Current Local API / Services                                |
|-------------------------------------------------------------|
| Jira Reader Service                                         |
| QA Analysis Service                                         |
| Test Case Generator Service                                 |
| Coverage Gap Service                                        |
| Playwright Script Generator Service                         |
| Approval Service                                            |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Future MCP Tool Layer                                       |
|-------------------------------------------------------------|
| Jira MCP Server       -> tickets, comments, status          |
| GitHub MCP Server     -> files, branches, PRs, commits      |
| Playwright MCP Server -> tests, tags, reports, execution    |
| Test Case MCP Server  -> TestRail/Xray/manual cases         |
| Reporting MCP Server  -> Jira summaries, HTML, Markdown     |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| External Systems                                            |
|-------------------------------------------------------------|
| Jira Cloud | GitHub | GitHub Actions | Playwright | Xray     |
| TestRail   | Slack  | Teams          | Reports    | Artifacts|
+-------------------------------------------------------------+
```

## Data Flow Diagram

| Step | Input | Component | Output | Human Approval Required |
| --- | --- | --- | --- | --- |
| 1 | Jira ticket key or local JSON | Jira reader / future Jira MCP | Normalized ticket with comments | No |
| 2 | Ticket details | QA analysis service | QA summary, risk, assumptions, dependencies | No |
| 3 | Acceptance criteria and comments | Test case generator | Manual test cases | Review recommended |
| 4 | Ticket criteria and repo tests | Coverage service / future Playwright MCP | Coverage gaps and recommended tags | No |
| 5 | Ticket + analysis | Script generator | Pending Playwright script | Yes before insertion |
| 6 | Pending script | Approval service | Script copied into framework | Yes |
| 7 | Test tag or approved spec | Playwright runner / future Playwright MCP | Test results and artifacts | No, but controlled tags only |
| 8 | Results + ticket context | Reporting service / future Reporting MCP | Jira-ready QA summary | Review before posting |
| 9 | Approved changes | GitHub MCP | Branch, commit, pull request | Yes |
| 10 | QA summary | Jira MCP | Jira comment or status update | Yes for status transitions |

## Component Responsibility Table

| Component | Responsibility | Current MVP | Future MCP Role |
| --- | --- | --- | --- |
| React UI | User workflow, selection, review, approval | Active | Stays as human control plane |
| Local API Server | Backend orchestration | Active | Can call MCP tools later |
| Jira Client | Jira Cloud REST API integration | Active direct API | Move behind Jira MCP server |
| QA Analysis Service | Risk, strategy, guidance | Active local domain logic | Should remain internal initially |
| Test Case Generator | Manual test cases | Active local domain logic | Can expose through MCP later |
| Coverage Gap Service | Map AC to Playwright tests/tags | Active local logic | Can use Playwright MCP inventory |
| Script Generator | Generate pending Playwright scripts | Active local logic | Can expose safe pending generation tool |
| Approval Service | Human-approved framework insertion | Active and mandatory | Should remain guarded; never fully autonomous |
| GitHub Actions | CI execution and artifacts | Active workflow | Can be triggered or summarized by GitHub MCP |
| MCP Servers | Standard AI tool interface | Planned / optional | Future scalability layer |

## MCP vs Direct API Comparison

| Area | Direct API | MCP |
| --- | --- | --- |
| MVP speed | Faster | Slower initially |
| Debugging | Simple | More layers to inspect |
| Vendor API control | Direct full control | Abstracted by tool contracts |
| AI tool safety | Must be custom-built | Tool schemas create safer boundaries |
| Reuse across AI clients | Limited | Strong |
| Multi-tool orchestration | More custom code | Cleaner agent tool model |
| Governance | Manual conventions | Standardized tool boundaries |
| Best use | MVP and core app services | Future agentic integrations |

## Current MVP Without MCP

The current MVP should continue using direct integrations for:

- Jira ticket loading.
- Jira comments reading.
- QA analysis generation.
- Manual test case generation.
- Coverage gap checks.
- Pending Playwright script generation.
- Human approval.
- Local Playwright execution.
- GitHub Actions CI workflow.

This is the right choice because the MVP still needs stability, clarity, and fast iteration.

## Future Architecture With MCP

Future architecture should introduce MCP gradually.

```text
AI Client / Agent
  -> MCP Client
    -> Jira MCP Server
    -> GitHub MCP Server
    -> Playwright MCP Server
    -> Test Case MCP Server
    -> Reporting MCP Server
  -> Domain Services
  -> Human Approval Gate
  -> External Systems
```

In this model, the AI uses MCP tools instead of calling internal APIs directly.

Example:

```text
AI asks: getTicketDetails(PROJECT-123)
MCP Jira Server calls Jira REST API
MCP returns normalized ticket JSON
AI asks: mapTagsToTests(@checkout)
MCP Playwright Server scans tests and reports matching specs
AI asks: createPullRequest(...)
MCP GitHub Server creates PR only after approval
```

## Future MCP Servers and Tools

### 1. Jira MCP Server

Purpose: expose Jira ticket operations safely.

Tools:

```text
getAssignedTickets
getTicketDetails
addJiraComment
updateTicketStatus
```

Example tool definition:

```ts
{
  name: 'getTicketDetails',
  description: 'Read Jira ticket details including description, acceptance criteria, comments, status, priority, and labels.',
  inputSchema: {
    type: 'object',
    properties: {
      ticketKey: { type: 'string' }
    },
    required: ['ticketKey']
  }
}
```

### 2. GitHub MCP Server

Purpose: expose repository and PR workflow safely.

Tools:

```text
readRepositoryFiles
createBranch
commitGeneratedTest
createPullRequest
```

Example tool definition:

```ts
{
  name: 'createPullRequest',
  description: 'Create a pull request for a human-approved generated Playwright test.',
  inputSchema: {
    type: 'object',
    properties: {
      branchName: { type: 'string' },
      title: { type: 'string' },
      body: { type: 'string' }
    },
    required: ['branchName', 'title', 'body']
  }
}
```

### 3. Playwright MCP Server

Purpose: expose test inventory, execution, and reports.

Tools:

```text
listTests
runTestsByTag
getLatestTestReport
mapTagsToTests
```

Example tool definition:

```ts
{
  name: 'runTestsByTag',
  description: 'Run Playwright tests using an allow-listed tag only.',
  inputSchema: {
    type: 'object',
    properties: {
      tag: { type: 'string', enum: ['@smoke', '@login', '@cart', '@checkout', '@regression'] }
    },
    required: ['tag']
  }
}
```

### 4. Test Case MCP Server

Purpose: manage manual test cases and external test management sync.

Tools:

```text
saveManualTestCases
exportTestCases
syncToTestRailOrXray
```

Example tool definition:

```ts
{
  name: 'exportTestCases',
  description: 'Export generated manual test cases to Markdown, CSV, or JSON.',
  inputSchema: {
    type: 'object',
    properties: {
      format: { type: 'string', enum: ['markdown', 'csv', 'json'] }
    },
    required: ['format']
  }
}
```

### 5. Reporting MCP Server

Purpose: create QA reports for Jira, GitHub PRs, and stakeholders.

Tools:

```text
generateJiraSummary
generateHTMLReport
generateMarkdownReport
```

Example tool definition:

```ts
{
  name: 'generateJiraSummary',
  description: 'Generate a Jira-ready QA execution summary from ticket context and Playwright results.',
  inputSchema: {
    type: 'object',
    properties: {
      ticketKey: { type: 'string' },
      reportPath: { type: 'string' }
    },
    required: ['ticketKey', 'reportPath']
  }
}
```

## What Should Not Be Moved to MCP Yet

Do not move everything to MCP immediately.

Keep these local for now:

- Core QA analysis logic.
- Manual test case generation logic.
- Script generation templates.
- Human approval service.
- Local API endpoints used by the React UI.
- Playwright runner guardrails.
- Existing Jira API integration until stable.

Reasons:

- The MVP should remain simple.
- Debugging is easier with direct services.
- MCP adds another operational layer.
- The domain model is still evolving.
- Human approval boundaries must be proven first.

## Example End-to-End MCP Workflow

```text
1. AI Agent asks Jira MCP: getTicketDetails(PROJECT-123)
2. Jira MCP returns description, acceptance criteria, comments, priority, and status.
3. AI Agent asks Playwright MCP: mapTagsToTests(@checkout)
4. Playwright MCP returns matching tests and coverage hints.
5. AI Agent runs QA analysis using internal domain logic.
6. AI Agent detects missing automation coverage.
7. AI Agent asks script generator to create a pending Playwright script.
8. Human reviews generated code, assumptions, risks, and target path.
9. If approved, AI Agent asks GitHub MCP to create a branch.
10. GitHub MCP commits approved generated test.
11. GitHub MCP opens a pull request.
12. GitHub Actions runs smoke or tagged tests.
13. Reporting MCP generates a QA summary.
14. Human approves Jira comment.
15. Jira MCP posts QA summary back to Jira.
```

## Recommended Folder Structure

Suggested future structure:

```text
src/
  mcp/
    servers/
      jira.server.ts
      github.server.ts
      playwright.server.ts
      reporting.server.ts
    tools/
      jira.tools.ts
      github.tools.ts
      playwright.tools.ts
      reporting.tools.ts
      test-case.tools.ts
    schemas/
      jira.schema.ts
      github.schema.ts
      playwright.schema.ts
      reporting.schema.ts
    client/
      mcp-client.ts
    qa-mcp-server.ts
```

Current project can keep the single MCP server file until more MCP capability is needed:

```text
src/mcp/qa-mcp-server.ts
```

Split into multiple files only when the tool count grows or when different teams own different integrations.

## Phased Roadmap

### Phase 1: Stable MVP Without MCP

Goal:

```text
Build stable Jira + Playwright direct integration.
```

Scope:

- Read Jira tickets and comments.
- Analyze ticket details.
- Generate manual test cases.
- Detect Playwright coverage gaps.
- Generate pending scripts.
- Require human approval.
- Run Playwright tests by allow-listed tags.
- Generate QA summary.

Recommendation:

```text
Current phase should remain simple and direct.
```

### Phase 2: Internal Tool Abstraction Layer

Goal:

```text
Create clean internal interfaces before MCP conversion.
```

Example:

```ts
interface TicketTool {
  getAssignedTickets(): Promise<Ticket[]>;
  getTicketDetails(ticketKey: string): Promise<Ticket>;
}

interface TestRunnerTool {
  listTests(): Promise<TestInventory[]>;
  runTestsByTag(tag: string): Promise<TestRunResult>;
}
```

This makes future MCP migration easier.

### Phase 3: Jira MCP Server

Goal:

```text
Move Jira read/comment operations behind MCP tools.
```

Tools:

```text
getAssignedTickets
getTicketDetails
addJiraComment
updateTicketStatus
```

Start with read-only tools first.

### Phase 4: Playwright MCP Server

Goal:

```text
Expose safe Playwright inventory and execution tools.
```

Tools:

```text
listTests
mapTagsToTests
runTestsByTag
getLatestTestReport
```

Only allow approved tags. Do not allow arbitrary shell commands.

### Phase 5: GitHub MCP Server

Goal:

```text
Enable branch and PR workflow for approved generated tests.
```

Tools:

```text
readRepositoryFiles
createBranch
commitGeneratedTest
createPullRequest
```

Important:

```text
Only commit generated tests after explicit approval.
```

### Phase 6: Full Agentic QA Assistant

Goal:

```text
Use MCP tools to orchestrate Jira, GitHub, Playwright, reporting, and notifications.
```

Capabilities:

- Read Jira ticket.
- Analyze requirements.
- Generate QA strategy.
- Generate manual test cases.
- Detect automation gaps.
- Generate pending script.
- Ask human approval.
- Create GitHub PR.
- Run GitHub Actions.
- Summarize results.
- Post Jira comment.
- Notify Slack or Teams.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Overengineering too early | Slows MVP delivery | Keep MCP as roadmap until direct flow is stable |
| AI commits generated tests without approval | Unsafe framework changes | Keep approval service mandatory |
| MCP tools expose too much power | Security and compliance risk | Use narrow tool schemas and allow-lists |
| Arbitrary Playwright command execution | Dangerous CI/local execution | Only allow predefined tags and safe options |
| Jira status updates happen automatically | Workflow noise or incorrect transitions | Require human confirmation for comments/status changes |
| Secret leakage | Credential compromise | Use environment variables and GitHub secrets only |
| Tool output becomes too large | Poor AI performance | Return summarized, scoped responses |
| Vendor API changes | Broken integrations | Keep MCP tools behind service adapters |

## Recommendation: When to Implement MCP

Do not make MCP the core architecture immediately.

Recommended decision:

```text
Use direct APIs for the MVP.
Use MCP when the project needs multi-tool agent orchestration, reusable AI clients, GitHub PR automation, reporting integrations, and enterprise governance.
```

Best implementation trigger:

```text
Implement MCP seriously after Jira + Playwright + human approval + GitHub Actions are stable.
```

Practical near-term approach:

- Keep the current UI and local API stable.
- Keep Jira and Playwright direct integrations working.
- Maintain the existing MCP server as an experimental/prototype layer.
- Add MCP tools gradually, starting with read-only Jira and Playwright inventory.
- Add write tools only behind explicit approval gates.

## Final Professional Guidance

MCP is a strong fit for this project, but it should be introduced carefully.

The AI-Augmented QA Agent should use MCP as a future integration layer, not as a replacement for every internal service. The most professional architecture is a hybrid approach:

```text
Current MVP:
React UI + Local API + Direct Jira/Playwright Services

Future Scale:
React UI + Domain Services + MCP Tool Layer + External Systems
```

The AI should remain an assistant, not an uncontrolled actor.

Final principle:

```text
AI can recommend.
AI can generate pending artifacts.
AI can summarize.
Humans approve framework changes, commits, pull requests, and Jira workflow updates.
```
