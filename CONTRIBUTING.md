# Contributing Guide

Thank you for contributing to AI-Augmented QA Agent. This project is intended to remain clean, understandable, and portfolio-ready while supporting future collaboration.

## Development Principles

- Keep QA workflows traceable from Jira ticket to test evidence.
- Prefer readable Playwright page objects over duplicated selectors.
- Use stable locators: role, label, placeholder, text, and test-id selectors before CSS.
- Keep generated tests in `generated-tests/pending/` until reviewed.
- Do not commit secrets, reports, videos, traces, or local environment files.
- Keep commits small and focused.

## Branch Naming

Use short, descriptive branch names:

```text
feature/jira-ticket-intake
feature/coverage-gap-analyzer
feature/playwright-script-generator
fix/popup-handling
docs/readme-refresh
```

## Commit Convention

Use Conventional Commits:

```text
feat(auth): add login automation
feat(homepage): add smoke tests
feat(jira): add ticket integration
feat(ai): add coverage gap analyzer
fix(playwright): stabilize popup handling
docs(readme): update project documentation
```

Recommended commit types:

```text
feat     new feature
fix      bug fix
docs     documentation-only change
test     test additions or updates
refactor code restructuring without behavior change
chore    tooling, config, or maintenance
ci       CI/CD configuration
```

## Local Setup

```powershell
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Update `.env` with local credentials. Never commit `.env`.

## Validation Before Pull Request

Run:

```powershell
npm run build
npx playwright test --list
```

When changing Playwright behavior, run the relevant tagged suite:

```powershell
npx playwright test --grep "@smoke"
npx playwright test --grep "@auth"
npx playwright test --grep "@regression"
```

## Pull Request Checklist

- [ ] The change has a focused scope.
- [ ] Local build passes.
- [ ] Relevant Playwright tests were run or intentionally skipped with explanation.
- [ ] No secrets, reports, videos, traces, or generated artifacts are committed.
- [ ] Documentation was updated when behavior changed.
- [ ] Generated Playwright specs were reviewed before being moved into `tests/e2e/`.

## Code Review Expectations

Reviewers should prioritize:

- broken test behavior
- unstable selectors
- missing environment safeguards
- unsafe Jira or filesystem operations
- unclear generated-code approval flow
- documentation drift

## Security Notes

Do not commit:

- Jira API tokens
- login credentials
- Playwright videos or traces containing customer data
- screenshots containing private Jira or environment details
- `.env` files

