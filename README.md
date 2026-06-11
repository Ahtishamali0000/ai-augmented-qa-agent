# AI-Augmented QA Agent

AI-Augmented QA Agent is an AI-powered QA Engineering platform that connects Jira ticket intelligence with Playwright automation. It reads Jira tickets, generates QA testing strategies, detects coverage gaps, suggests Playwright automation, executes tagged test suites, and prepares execution evidence for review.

The project is designed as a professional SDET/QA automation portfolio piece and as a foundation for future team collaboration.

## Key Features

- Jira ticket ingestion for scoped QA workflows
- AI-style ticket analysis and risk classification
- Manual QA test strategy generation
- Coverage gap detection against existing Playwright tests
- Playwright script suggestion with human approval flow
- Pending test generation before framework adoption
- Playwright page-object framework for ecommerce journeys
- Tagged execution through CLI and local UI
- HTML, JSON, screenshot, video, and trace report support
- Dark and light UI theme selection
- Portfolio-ready documentation, roadmap, and collaboration files

## Architecture Overview

```text
Jira Cloud
  |
  v
Local API Server
  - Jira ticket reader
  - QA analysis service
  - Coverage gap analyzer
  - Playwright script generator
  - Approval gate
  - Playwright runner
  |
  v
React Showcase UI
  - Scoped Jira workspace
  - QA assignee filter
  - Analysis panels
  - Script preview
  - Test runner
  |
  v
Playwright Framework
  - Fixtures
  - Page objects
  - Components
  - Tagged specs
  - Reports and artifacts
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed component design.

## Folder Structure

```text
.
├── components/                 # Shared Playwright page components
├── docs/                       # Architecture and GitHub setup docs
├── fixtures/                   # Playwright test fixtures
├── generated-tests/            # AI-generated pending specs
├── pages/                      # Playwright page objects
├── samples/                    # Local Jira-style sample ticket data
├── server/                     # Local API server for Jira and Playwright orchestration
├── src/
│   ├── cli/                    # CLI entry points
│   ├── integrations/           # External integration clients
│   ├── services/               # QA analysis, coverage, approval, and generation logic
│   ├── types/                  # TypeScript domain types
│   ├── App.tsx                 # React showcase application
│   └── styles.css              # Application styling and themes
├── tests/e2e/                  # Playwright E2E tests
├── utils/                      # Test data, environment, and logging utilities
├── CONTRIBUTING.md             # Contribution workflow
├── CHANGELOG.md                # Semantic version history
├── README.md                   # Project overview
└── playwright.config.ts        # Playwright configuration
```

## Installation Guide

Prerequisites:

- Node.js 20 or newer
- npm
- Chromium browser dependencies for Playwright
- Jira Cloud API token for live Jira integration

Install dependencies:

```powershell
npm install
```

Install Playwright browsers:

```powershell
npx playwright install chromium
```

Build the application:

```powershell
npm run build
```

## Environment Setup

Create a local `.env` file from `.env.example`.

```powershell
Copy-Item .env.example .env
```

Required Jira configuration:

```env
JIRA_BASE_URL=https://egoshoes.atlassian.net
JIRA_EMAIL=your-atlassian-email@example.com
JIRA_API_TOKEN=your-atlassian-api-token
JIRA_QA_ASSIGNEES=Sana.khan,Naveed Chughtai
API_PORT=8787
```

Test environment configuration:

```env
CF_UK_URL=https://cfstaging.ego.co.uk/
CF_US_URL=https://cfstaging.egoshoes.com/us
CF_EU_URL=https://cfstaging.egoshoes.com/eu
UAT1_UK_URL=https://cf-uat1.ego.co.uk/
UAT1_US_URL=https://cf-uat1.egoshoes.com/us
UAT1_EU_URL=https://cf-uat1.egoshoes.com/eu
DEFAULT_TEST_ENV=CF
DEFAULT_LOCALE=UK
LOGIN_EMAIL=
LOGIN_PASSWORD=
```

Never commit `.env` or real Jira tokens.

## Running The Application

Terminal 1:

```powershell
npm run dev:api
```

Terminal 2:

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

## Running Tests

Run all Playwright tests:

```powershell
npm run test:e2e
```

Run smoke tests:

```powershell
npm run test:e2e:smoke
```

Run login tests:

```powershell
npm run test:e2e:login
```

Run by tag:

```powershell
npx playwright test --grep "@auth"
npx playwright test --grep "@register"
npx playwright test --grep "@regression"
```

Open the Playwright report:

```powershell
npm run test:e2e:report
```

## Jira Integration

The local API server uses Jira Cloud REST API v3 through:

```text
/rest/api/3/search/jql
```

Current scoped Jira intake:

```text
EGO App
  TESTFLIGHT TESTING
  Production Testing

VSF2 board 20
  DEV QA (TESTING ON DEV)
  CODE REVIEW (PR TO STAGE)
```

The UI loads all scoped tickets first and then allows filtering by QA assignee:

```text
All tickets
Sana.khan
Naveed Chughtai
```

If tickets exist in the browser but do not appear in the app, verify:

- `JIRA_EMAIL` matches the Atlassian account that created the token
- `JIRA_API_TOKEN` is valid and not expired or revoked
- the Jira user can browse `EGO App` and `VSF2`
- the Jira user can open a known issue such as `VSF2-422`

## AI Analysis Flow

```text
1. Load scoped Jira tickets
2. Select or filter a QA ticket
3. Normalize ticket fields, comments, labels, components, and status
4. Generate QA summary, risk level, assumptions, and dependencies
5. Generate manual test cases
6. Compare acceptance criteria with existing Playwright tags
7. Identify missing or partial automation coverage
8. Suggest a Playwright spec into generated-tests/pending/
9. Require human approval before copying into tests/e2e/
10. Run tagged Playwright tests and review reports
```

## Versioning Strategy

This project follows semantic versioning.

| Version | Milestone | Scope |
| --- | --- | --- |
| v0.1.0 | Framework Setup | Base React, TypeScript, Playwright, fixtures, page objects |
| v0.2.0 | Authentication Automation | Login, registration, auth tags, credentials handling |
| v0.3.0 | Jira Integration | Jira API connection, scoped ticket loading, QA filtering |
| v0.4.0 | Coverage Gap Analyzer | Acceptance criteria mapping and coverage gap detection |
| v0.5.0 | Playwright Script Generator | Pending script generation and approval workflow |
| v0.6.0 | AI Execution Summary | Test result parsing and AI-style execution summaries |
| v1.0.0 | Production MVP | Stable Jira-to-Playwright QA assistant with reporting and governance |

## GitHub Repository Metadata

Recommended repository name:

```text
ai-augmented-qa-agent
```

Recommended repository description:

```text
AI-powered QA Engineering Assistant that transforms Jira tickets into test strategies, coverage analysis, Playwright automation recommendations, and execution reports.
```

Suggested topics:

```text
playwright typescript qa-automation software-testing jira ai llm testing quality-assurance automation-framework devops github-actions sdet prompt-engineering agentic-ai
```

## Future Roadmap

- Add OpenAI structured-output powered analysis
- Add GitHub Actions CI for Playwright smoke and regression suites
- Add PR-based approval flow for generated specs
- Add execution summary generation from Playwright JSON reports
- Add flaky test detection and retry analytics
- Add Slack or Teams notification summaries
- Add role-based approval controls
- Add richer Jira custom field mapping
- Add test impact analysis from changed files
- Add dashboard metrics for QA coverage and automation ROI

## Screenshots

Add screenshots after UI stabilization.

```text
docs/assets/screenshots/dashboard-dark.png
docs/assets/screenshots/dashboard-light.png
docs/assets/screenshots/jira-ticket-analysis.png
docs/assets/screenshots/playwright-runner.png
docs/assets/screenshots/coverage-gap-report.png
```

## Commit Strategy

Use Conventional Commits:

```text
feat(auth): add login automation
feat(homepage): add smoke tests
feat(jira): add ticket integration
feat(ai): add coverage gap analyzer
fix(playwright): stabilize popup handling
docs(readme): update project documentation
```

## License

This project is prepared for portfolio and professional collaboration use. Add a license file before publishing as open source.

