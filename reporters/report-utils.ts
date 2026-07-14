import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import * as XLSX from 'xlsx';

export type QaStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted' | string;

export type QaResult = {
  title: string;
  feature: string;
  featureFile: string;
  browser: string;
  status: QaStatus;
  duration: number;
  tags: string[];
  error?: string;
  stack?: string;
  screenshot?: string;
  trace?: string;
  video?: string;
};

const REPORT_ROOT = resolve(process.cwd(), 'reports');

export function ensureReportDirectories() {
  [
    'playwright/html',
    'allure-results',
    'allure-report',
    'markdown',
    'excel',
    'ndjson',
    'failures',
  ].forEach((path) => mkdirSync(resolve(REPORT_ROOT, path), { recursive: true }));
}

export function writeQaArtifacts(results: QaResult[]) {
  ensureReportDirectories();
  writeFileSync(resolve(REPORT_ROOT, 'run-summary.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    totals: totalsFor(results),
    results,
  }, null, 2));
  writeMarkdownReports(results);
  writeExcelMatrix(results);
  writeFailureTriage(results);
}

export function loadResultsFromPlaywrightJson(): QaResult[] {
  const path = resolve(REPORT_ROOT, 'playwright/results.json');
  if (!existsSync(path)) {
    throw new Error(`Playwright JSON report not found: ${relative(process.cwd(), path)}`);
  }

  const report = JSON.parse(readFileSync(path, 'utf8'));
  const results: QaResult[] = [];

  visitSuites(report.suites || [], results);
  return results;
}

function visitSuites(suites: any[], results: QaResult[]) {
  for (const suite of suites) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const lastResult = test.results?.at(-1) || {};
        const attachments = lastResult.attachments || [];
        const tags = extractTags(`${spec.title || ''} ${(test.tags || []).join(' ')}`);
        results.push({
          title: spec.title || test.title || 'Untitled scenario',
          feature: featureName(spec.file || suite.title || 'Unmapped feature'),
          featureFile: spec.file || '',
          browser: test.projectName || 'unknown',
          status: normalizeStatus(test.status || test.outcome || lastResult.status),
          duration: lastResult.duration || 0,
          tags,
          error: lastResult.error?.message || lastResult.errors?.[0]?.message,
          stack: lastResult.error?.stack || lastResult.errors?.[0]?.stack,
          screenshot: attachmentPath(attachments, 'screenshot'),
          trace: attachmentPath(attachments, 'trace'),
          video: attachmentPath(attachments, 'video'),
        });
      }
    }
    visitSuites(suite.suites || [], results);
  }
}

function writeMarkdownReports(results: QaResult[]) {
  const groups = new Map<string, QaResult[]>();
  for (const result of results) {
    const key = result.feature || 'unmapped-feature';
    groups.set(key, [...(groups.get(key) || []), result]);
  }

  for (const [feature, scenarios] of groups) {
    const totals = totalsFor(scenarios);
    const jira = uniqueTagValues(scenarios, 'jira');
    const ac = uniqueTagValues(scenarios, 'ac');
    const coverage = uniqueTagValues(scenarios, 'coverage');
    const rows = scenarios.map((scenario) => [
      escapeCell(scenario.title),
      scenario.status,
      scenario.browser,
      `${scenario.duration} ms`,
      tagValue(scenario.tags, 'ac') || 'missing',
      artifactLinks(scenario),
      escapeCell(scenario.error || ''),
    ].join(' | '));

    const markdown = `# ${feature}

- Jira ticket: ${jira.join(', ') || 'Unmapped'}
- Acceptance criteria: ${ac.join(', ') || 'Missing'}
- Coverage: ${coverage.join(', ') || 'missing'}
- QA summary: ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped

| Scenario | Status | Browser | Duration | Acceptance criteria | Evidence | Failure reason |
| --- | --- | --- | ---: | --- | --- | --- |
${rows.map((row) => `| ${row} |`).join('\n')}
`;
    writeFileSync(resolve(REPORT_ROOT, 'markdown', `${slug(feature)}.md`), markdown);
  }
}

function writeExcelMatrix(results: QaResult[]) {
  const rows = results.map((result, index) => ({
    'Jira Ticket': tagValue(result.tags, 'jira') || 'Unmapped',
    'Acceptance Criteria ID': tagValue(result.tags, 'ac') || 'Missing',
    'Test Case ID': `TC-${String(index + 1).padStart(4, '0')}`,
    'Test Type': inferTestType(result.tags),
    'Scenario Title': result.title,
    Priority: tagValue(result.tags, 'priority') || 'Unspecified',
    'Test Data': result.tags.includes('@login') ? 'Configured environment credentials' : 'Environment-controlled',
    Steps: result.featureFile || result.feature,
    'Expected Result': `Scenario completes with acceptance-criteria coverage: ${tagValue(result.tags, 'coverage') || 'missing'}`,
    'Automation Status': result.tags.includes('@manual') ? 'Partial / Manual' : result.status,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      'Jira Ticket',
      'Acceptance Criteria ID',
      'Test Case ID',
      'Test Type',
      'Scenario Title',
      'Priority',
      'Test Data',
      'Steps',
      'Expected Result',
      'Automation Status',
    ],
  });
  worksheet['!cols'] = [14, 22, 14, 16, 42, 14, 32, 45, 54, 20].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Case Matrix');
  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  writeFileSync(resolve(REPORT_ROOT, 'excel/test-case-matrix.xlsx'), output);
}

function writeFailureTriage(results: QaResult[]) {
  const failures = results
    .filter((result) => ['failed', 'timedOut', 'interrupted'].includes(result.status))
    .map((result) => {
      const failureType = classifyFailure(result.error || '');
      return {
        testTitle: result.title,
        featureFile: result.featureFile,
        scenario: result.title,
        browser: result.browser,
        errorMessage: result.error || 'Unknown test failure',
        stackTrace: result.stack || '',
        screenshotPath: result.screenshot || '',
        tracePath: result.trace || '',
        videoPath: result.video || '',
        suggestedFailureType: failureType,
        suggestedNextAction: nextAction(failureType),
        rerunCommand: `npx playwright test --config=playwright.bdd.config.ts --last-failed --project=${result.browser}`,
      };
    });

  writeFileSync(resolve(REPORT_ROOT, 'failures/failure-triage.json'), JSON.stringify(failures, null, 2));
}

export function extractTags(value: string) {
  return [...new Set(value.match(/@[A-Za-z0-9:_-]+/g) || [])];
}

export function normalizeStatus(status = 'unknown') {
  if (status === 'expected') return 'passed';
  if (status === 'unexpected') return 'failed';
  return status;
}

export function featureName(file: string) {
  return basename(file)
    .replace(/\.feature\.spec\.[cm]?[jt]s$/i, '')
    .replace(/\.(feature|spec|test)\.[cm]?[jt]s$|\.feature$/i, '') || 'unmapped-feature';
}

function attachmentPath(attachments: any[], name: string) {
  return attachments.find((attachment) => attachment.name?.toLowerCase().includes(name))?.path || '';
}

function totalsFor(results: QaResult[]) {
  return results.reduce((totals, item) => {
    if (item.status === 'passed') totals.passed += 1;
    else if (item.status === 'skipped') totals.skipped += 1;
    else totals.failed += 1;
    totals.total += 1;
    return totals;
  }, { total: 0, passed: 0, failed: 0, skipped: 0 });
}

function uniqueTagValues(results: QaResult[], key: string) {
  return [...new Set(results.map((result) => tagValue(result.tags, key)).filter(Boolean))];
}

function tagValue(tags: string[], key: string) {
  return tags.find((tag) => tag.startsWith(`@${key}:`))?.slice(key.length + 2) || '';
}

function inferTestType(tags: string[]) {
  const types = ['positive', 'negative', 'ui', 'navigation', 'edge', 'security', 'regression', 'accessibility', 'responsive', 'api'];
  return types.find((type) => tags.includes(`@${type}`))?.replace(/^./, (char) => char.toUpperCase()) || 'UI';
}

function artifactLinks(result: QaResult) {
  return [
    result.screenshot && `[Screenshot](${toLink(result.screenshot)})`,
    result.trace && `[Trace](${toLink(result.trace)})`,
    result.video && `[Video](${toLink(result.video)})`,
  ].filter(Boolean).join(', ') || '—';
}

function toLink(path: string) {
  return relative(resolve(REPORT_ROOT, 'markdown'), resolve(path)).replaceAll('\\', '/');
}

function escapeCell(value: string) {
  return stripAnsi(value).replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'feature';
}

function classifyFailure(message: string) {
  if (/timeout|net::|ECONN|DNS|browser.*closed/i.test(message)) return 'Environment Issue';
  if (/strict mode|locator|selector|expect\(/i.test(message)) return 'Test Script Issue';
  if (/fixture|test data|credential|duplicate/i.test(message)) return 'Data Issue';
  if (/flaky|retry|intermittent/i.test(message)) return 'Flaky Test';
  return 'Application Bug';
}

function nextAction(type: string) {
  const actions: Record<string, string> = {
    'Application Bug': 'Reproduce manually, attach evidence, and raise or update the linked defect.',
    'Test Script Issue': 'Review the POM locator/action and compare it with the current accessible UI contract.',
    'Environment Issue': 'Check target availability, deployment health, browser logs, and network dependencies.',
    'Data Issue': 'Refresh or isolate the test data and rerun the failed scenario.',
    'Flaky Test': 'Rerun once, inspect trace timing, and quarantine only with an owner and expiry.',
  };
  return actions[type];
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}
