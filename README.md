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

Restart `npm run dev:api` after changing server routes. If port `8787` is already occupied by an older local process, stop that process before starting the API again. For an alternate API port, set `API_PORT` for the API and point Vite at the same server with `VITE_API_TARGET`.

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

## GitHub Actions Integration

This repository includes a GitHub Actions workflow:

```text
.github/workflows/qa-automation.yml
```

The workflow runs:

```text
1. Checkout repository
2. Install Node.js dependencies
3. Install Playwright Chromium
4. Build the TypeScript/Vite app
5. Optionally analyze a Jira ticket from manual workflow input
6. Run tagged Playwright tests
7. Upload Playwright HTML and JSON reports as artifacts
```

### Required GitHub Secrets

Add these in GitHub:

```text
Repository → Settings → Secrets and variables → Actions → New repository secret
```

Recommended secrets:

```text
JIRA_BASE_URL
JIRA_EMAIL
JIRA_API_TOKEN
OPENAI_API_KEY
LOGIN_EMAIL
LOGIN_PASSWORD
```

Recommended variables:

```text
DEFAULT_TEST_ENV
DEFAULT_LOCALE
PLAYWRIGHT_BASE_URL
```

### Manual Workflow Run

Open:

```text
GitHub → Actions → QA Automation Pipeline → Run workflow
```

Optional inputs:

```text
test_tag=@smoke
jira_ticket_key=PROJECT-123
```

Examples:

```text
@smoke
@login
@cart
@checkout
@payment
```

The workflow does not automatically approve or merge generated Playwright scripts. Generated scripts still require human review before they are added to the framework.

## GitHub Actions CI/CD

This repository includes a production-style QA pipeline:

```text
.github/workflows/qa-playwright.yml
```

Recommended required branch protection check:

```text
QA Playwright Tests
```

The workflow runs on pull requests to `main`, pushes to `main`, and manual dispatch. It installs dependencies, installs Chromium, builds the TypeScript/Vite app, runs selected Playwright tests, uploads reports, and writes a GitHub job summary.

### Stable CI Strategy

Default CI suite:

```text
all-stable -> @smoke|@login|@homepage
```

Registration automation is currently excluded from `all-stable` CI because Cloudflare verification may block full registration on CF staging. It can be executed manually with `@register` after QA environment allowlisting. Do not bypass Cloudflare.

### Workflow Inputs

Manual workflow inputs:

```text
test_suite:
  smoke      -> @smoke
  auth       -> @auth
  login      -> @login
  homepage   -> @homepage
  regression -> @regression
  all-stable -> @smoke|@login|@homepage

environment:
  CF_UK
  CF_US
  CF_EU
  UAT1_UK
  UAT1_US
  UAT1_EU

headed:
  false by default

jira_ticket_key:
  optional placeholder for future AI-triggered execution
```

The workflow maps the selected environment to `PLAYWRIGHT_BASE_URL` before running Playwright.

### Required GitHub Secrets

Add these in GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

Required or recommended secrets:

```text
LOGIN_EMAIL
LOGIN_PASSWORD
JIRA_BASE_URL
JIRA_EMAIL
JIRA_API_TOKEN
OPENAI_API_KEY
```

Public environment URLs are defined in the workflow:

```text
CF_UK_URL=https://cfstaging.ego.co.uk/
CF_US_URL=https://cfstaging.egoshoes.com/us
CF_EU_URL=https://cfstaging.egoshoes.com/eu
UAT1_UK_URL=https://cf-uat1.ego.co.uk/
UAT1_US_URL=https://cf-uat1.egoshoes.com/us
UAT1_EU_URL=https://cf-uat1.egoshoes.com/eu
```

### Uploaded Artifacts

Artifacts are uploaded even when tests fail and are retained for 7 days:

```text
playwright-html-report   -> reports/playwright/html
playwright-json-report   -> reports/playwright/results.json
playwright-test-results  -> test-results and reports/playwright/artifacts
```

### Local CI Commands

Run the same stable checks locally:

```powershell
npm ci
npx playwright install chromium
npm run build
npm run test:stable
```

Run focused suites:

```powershell
npm run test:homepage
npm run test:login
npm run test:smoke
npm run test:auth
npm run test:regression
npm run test:report
```

Run with an explicit environment:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://cfstaging.ego.co.uk/"
npm run test:stable
```

### Troubleshooting

- If login tests skip or fail, verify `LOGIN_EMAIL` and `LOGIN_PASSWORD` GitHub secrets.
- If a staging site blocks automation with Cloudflare, do not bypass it. Use environment allowlisting or run the affected suite manually after QA approval.
- If no Playwright report uploads, check whether the test step started and whether `reports/playwright/results.json` was generated.
- If the wrong storefront opens, confirm the selected workflow `environment` and the resolved `PLAYWRIGHT_BASE_URL` in the job summary.
- If Jira context is needed, provide `jira_ticket_key`; the current workflow prints a placeholder for future AI Jira execution and does not run full Jira automation yet.

## GitHub Issue Management

This repository includes GitHub issue forms for lightweight management:

```text
.github/ISSUE_TEMPLATE/user-story.yml
.github/ISSUE_TEMPLATE/bug-report.yml
```

Use these to create:

```text
User stories
Bugs
QA-ready tickets
Regression candidates
Automation candidates
```

For full Jira management, continue using Jira as the source of truth. GitHub Issues can be used for engineering follow-up, bugs found by automation, and lightweight backlog items.

## MCP Server Integration

This project includes a local Model Context Protocol server for professional QA automation workflows:

Architecture and roadmap document:

```text
docs/MCP_INTEGRATION_PLAN.md
```

```text
src/mcp/qa-mcp-server.ts
```

Run it with:

```bash
npm run mcp:server
```

The MCP server exposes safe QA tools to MCP-compatible clients:

```text
list_jira_tickets
list_project_qa_scope
list_scoped_qa_tickets
read_jira_ticket
analyze_jira_ticket
create_qa_execution_package
draft_passed_qa_comment
post_approved_jira_comment
generate_manual_test_cases
check_playwright_coverage
generate_pending_playwright_script
list_playwright_tags
```

Professional QA use cases:

```text
1. Ask an AI client to read Jira ticket context.
2. Include Jira description, acceptance criteria, and comments.
3. Generate QA strategy and risk analysis.
4. Generate manual test cases.
5. Check Playwright automation coverage.
6. Generate a pending Playwright script for review.
7. Keep human approval mandatory before framework insertion.
```

Safety model:

```text
- MCP can read Jira context.
- MCP can analyze tickets.
- MCP can generate pending scripts.
- MCP cannot approve generated scripts automatically.
- Framework insertion still requires explicit human approval.
```

Example client configuration:

```text
docs/mcp-client-config.example.json
```

Before running MCP, install dependencies:

```bash
npm install
```

## Future Roadmap

- Add OpenAI structured-output powered analysis
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

## Agentic QA BDD Pipeline

Gherkin is the source of truth for new automation. `playwright-bdd` compiles `features/**/*.feature` into native Playwright tests under the generated, ignored `tests/.features-gen/` directory. `playwright.bdd.config.ts` inherits the shared browser/report settings but uses the required generated test root. Existing `tests/e2e/**/*.spec.ts` continue through `playwright.config.ts` during migration.

The automation boundary is deliberate:

```text
Jira story + acceptance criteria
  -> reviewed .feature scenario and AC metadata
  -> step definition
  -> page object/component method
  -> Playwright browser project
  -> NDJSON + HTML + JSON + Allure + Markdown + Excel + triage
```

### Install and generate

The dependencies are committed in `package.json` and `package-lock.json`. For a fresh equivalent setup:

```bash
npm install --save-dev playwright-bdd @cucumber/cucumber allure-playwright allure-commandline
npm install --save-dev https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npx playwright install
npm run bddgen
```

`@cucumber/cucumber` is available for Cucumber utilities and compatibility; execution remains on Playwright Test through `playwright-bdd`.

### Run BDD suites

```bash
npm run test:bdd
npm run test:bdd:chromium
npm run test:bdd:firefox
npm run test:bdd:webkit
npm run test:bdd:all
npm run test:bdd:smoke
npm run test:bdd:auth
npm run test:bdd:regression
npm run test:bdd:failed
```

Local runs are headed by default; CI is headless. Override explicitly:

```powershell
$env:HEADLESS="true"
npm run test:bdd:smoke
```

Destructive scenarios (`@destructive`) are excluded unless a reviewer deliberately enables them:

```powershell
$env:ALLOW_DESTRUCTIVE_TESTS="true"
npm run test:bdd:chromium
```

Never enable that flag against production. Order placement, payment completion, registration submission, and account deletion require isolated test data, a sandbox integration, and explicit approval. The registration feature is currently `@manual @skip` because environment/Cloudflare stability is not guaranteed.

Scenarios tagged `@unstable` are also excluded from stable execution. Enable them only for diagnosis:

```powershell
$env:ALLOW_UNSTABLE_TESTS="true"
npm run test:bdd:auth
```

The current staging login form keeps its submit button disabled even when both native fields are valid. Login therefore remains `@coverage:partial @unstable`; the test fails honestly when explicitly enabled instead of forcing the disabled control or reporting a false green. The legacy VSF2 cart/checkout drafts are also unstable because their hard-coded `heels` search currently returns zero products; they require an environment-owned SKU fixture before reactivation.

### Acceptance-criteria contract

Every scenario carries `@jira:<key>`, `@ac:<id>`, `@module:<name>`, `@priority:<level>`, `@risk:<level>`, test-type tags, and one of:

- `@coverage:covered`: the automated assertions fully verify the AC.
- `@coverage:partial`: useful automated evidence exists, but a named part remains manual.
- `@coverage:missing`: no valid automated assertion exists yet.

Do not label a scenario covered when it checks only presence instead of the stated layout, count, data, or state. For example, a mobile 2x3 logo requirement must assert two columns and three rows at the mobile viewport.

### Reports and dashboard API

Every run writes:

```text
reports/playwright/html
reports/playwright/results.json
reports/allure-results
reports/markdown/<feature>.md
reports/excel/test-case-matrix.xlsx
reports/ndjson/live-output.ndjson
reports/failures/failure-triage.json
reports/run-summary.json
```

Generate reports again from the Playwright JSON result:

```bash
npm run report:markdown
npm run report:excel
npm run report:allure
```

The local API exposes:

```text
GET  /api/test-runs/latest
GET  /api/test-runs/live
GET  /api/test-runs/failures
GET  /api/test-runs/reports
GET  /api/test-runs/inventory
GET  /api/test-runs/artifacts/allure/index.html
POST /api/test-runs/run
POST /api/test-runs/rerun-failed
```

The inventory endpoint discovers active BDD scenarios, legacy Playwright specs, and pending generated features directly from the repository. The Allure artifact route safely serves the generated report and its nested assets for the embedded dashboard viewer.

The UI theme follows the OS preference initially and persists the user choice in `localStorage`. The Agentic QA dashboard provides browser/suite/Jira controls, a searchable full-test inventory, expandable acceptance-criteria mappings, an embedded Allure report, a destructive-test confirmation gate, live NDJSON events, report readiness, failure triage, and failed-test re-runs.

### Generated-test review gate

AI/mock generation must create a feature package in `generated-tests/pending/`; it must never write directly to active features or tests. Reviewers check stable identity (`Jira + AC + scenario`), duplicates, POM reuse, AC coverage honesty, and destructive tags. After approval, move the feature into `features/<module>/`, add only missing step mappings in `steps/`, and add only missing methods to `pages/` or `components/`. Run `npm run bddgen` before merging.

No paid API is needed. Local Jira JSON, deterministic generation rules, and mock AI mode remain supported.

### Migration plan

1. Run old specs and new BDD scenarios side by side.
2. Keep homepage and login as the first executable BDD slice.
3. Compare BDD and legacy evidence until the new scenarios are stable.
4. Migrate search, cart, footer, and checkout one AC at a time; remove `@manual @skip` only after assertions and test data are complete.
5. Keep registration optional until environment allowlisting and deterministic account cleanup exist.
6. Retire a legacy spec only after its ACs are fully mapped, reviewed, and green in Chromium CI.

The workflow `.github/workflows/agentic-qa.yml` runs Chromium smoke by default and supports manual browser, suite, headed, destructive, and Jira-key inputs. It uploads all report and browser evidence whether tests pass or fail.
