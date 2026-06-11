# Project Architecture

## System Purpose

AI-Augmented QA Agent transforms Jira tickets into actionable QA intelligence. It combines ticket ingestion, risk analysis, coverage gap detection, Playwright automation suggestions, human approval, and test execution reporting.

## High-Level Architecture

```text
Jira Cloud
  |
  | REST API v3
  v
Local API Server
  |
  | JSON API
  v
React QA Assistant UI
  |
  | approved actions
  v
Playwright Framework
  |
  | reports and artifacts
  v
Execution Evidence
```

## Runtime Components

### React UI

Location:

```text
src/App.tsx
src/styles.css
```

Responsibilities:

- Display portfolio-ready QA assistant interface.
- Load scoped Jira tickets.
- Filter tickets by QA assignee.
- Display ticket details, comments, status, and metadata.
- Trigger ticket analysis.
- Preview generated Playwright scripts.
- Approve generated scripts.
- Trigger tagged Playwright runs.
- Allow dark and light theme selection.

### Local API Server

Location:

```text
server/jira-server.mjs
```

Responsibilities:

- Load environment variables.
- Validate Jira credentials.
- Fetch scoped Jira tickets.
- Normalize Jira issue payloads.
- Analyze tickets.
- Generate manual test cases.
- Generate pending Playwright specs.
- Approve pending specs into the framework.
- Execute Playwright test tags through a guarded command path.
- Return Playwright report summaries.

### Jira Integration

Locations:

```text
server/jira-server.mjs
src/integrations/jira/jira.client.ts
```

Current Jira search endpoint:

```text
/rest/api/3/search/jql
```

Current scoped intake:

```text
EGO App
  TESTFLIGHT TESTING
  Production Testing

VSF2 board 20
  DEV QA (TESTING ON DEV)
  CODE REVIEW (PR TO STAGE)
```

Authentication model:

```text
JIRA_EMAIL + JIRA_API_TOKEN
```

The Jira account must be able to browse the relevant projects and issues.

### QA Analysis Services

Locations:

```text
src/services/ticket-analysis.service.ts
src/services/qa-analysis.service.ts
src/services/test-case-generator.service.ts
src/services/coverage-gap.service.ts
```

Responsibilities:

- Summarize ticket impact.
- Classify risk level.
- Generate manual QA scenarios.
- Identify regression areas.
- Recommend Playwright tags.
- Detect missing or partial automation coverage.

### Playwright Script Generation

Locations:

```text
src/services/test-script-generator.service.ts
src/services/playwright-script-generator.service.ts
generated-tests/pending/
```

Responsibilities:

- Generate a suggested Playwright spec.
- Save generated specs into `generated-tests/pending/`.
- Avoid directly modifying `tests/e2e/` during analysis.
- Require human approval before adopting generated specs.

### Approval Service

Location:

```text
src/services/approval.service.ts
server/jira-server.mjs
```

Responsibilities:

- Validate target folders.
- Copy approved pending specs into `tests/e2e/<module>/`.
- Preserve a human approval checkpoint before framework adoption.

### Playwright Framework

Locations:

```text
tests/e2e/
pages/
components/
fixtures/
utils/
playwright.config.ts
```

Responsibilities:

- Define E2E tests.
- Encapsulate page actions through page objects.
- Reuse setup through fixtures.
- Handle popups safely.
- Produce HTML, JSON, screenshot, video, and trace artifacts.

## Data Flow

### Jira Ticket Analysis Flow

```text
User clicks Load Scoped Tickets
  |
  v
API validates Jira auth
  |
  v
API searches Jira scoped statuses
  |
  v
UI displays all scoped tickets
  |
  v
User filters by QA assignee
  |
  v
User selects ticket
  |
  v
API analyzes ticket
  |
  v
UI displays QA strategy, risks, coverage, and recommendations
```

### Script Generation Flow

```text
Selected Jira ticket
  |
  v
QA analysis
  |
  v
Coverage gap detection
  |
  v
Generated Playwright suggestion
  |
  v
generated-tests/pending/<ticket>.spec.ts
  |
  v
Human approval
  |
  v
tests/e2e/<module>/<ticket>.spec.ts
```

### Test Execution Flow

```text
User selects Playwright tag
  |
  v
API validates allowed tag
  |
  v
npx playwright test --grep "<tag>"
  |
  v
reports/playwright/results.json
reports/playwright/html
reports/playwright/artifacts
  |
  v
UI summary and future AI execution summary
```

## Security Boundaries

- `.env` is ignored by Git.
- Jira credentials must stay local.
- Generated specs are not automatically merged into the framework.
- Playwright execution is restricted to allow-listed tags.
- The API is intended for local development unless authentication is added.
- Cloudflare and captcha must not be bypassed.

## Extension Points

Recommended future extensions:

- OpenAI structured-output analysis.
- GitHub PR generation for approved specs.
- GitHub Actions CI pipeline.
- Slack or Teams notifications.
- Jira comment writeback.
- OpenTelemetry traces.
- Role-based approvals.
- Test impact analysis.
- Flaky test detection.

## Operational Risks

| Risk | Mitigation |
| --- | --- |
| Invalid Jira token | Validate `/rest/api/3/myself` before search |
| Missing Jira permissions | Confirm Browse Project access for scoped projects |
| Generated flaky tests | Keep generated specs pending until review |
| Selector instability | Prefer role, label, placeholder, and test-id locators |
| Sensitive report artifacts | Keep reports ignored by Git |
| Local API exposure | Bind locally and add auth before production use |

