import http from 'node:http';
import { URL } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.API_PORT || 8787);
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf8');

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    process.env[key.trim()] ||= value;
  }
}

const jiraBaseUrl = normalizeBaseUrl(process.env.JIRA_BASE_URL || 'https://egoshoes.atlassian.net');
const jiraEmail = process.env.JIRA_EMAIL;
const jiraApiToken = process.env.JIRA_API_TOKEN;
const jiraDefaults = {
  projectKey: '',
  boardId: '',
  status: '',
  assignees: splitCsv(process.env.JIRA_QA_ASSIGNEES || 'Sana.khan,Naveed Chughtai'),
};
const jiraTicketScopes = [
  {
    project: 'EGO App',
    statuses: ['TESTFLIGHT TESTING', 'Production Testing'],
  },
  {
    project: 'VSF2',
    boardId: '20',
    statuses: ['DEV QA (TESTING ON DEV)', 'CODE REVIEW (PR TO STAGE)'],
  },
];
const allowedPlaywrightTags = new Set(['@smoke', '@auth', '@login', '@register', '@homepage', '@search', '@cart', '@checkout', '@payment', '@regression', '@ui']);
let activePlaywrightRun = null;

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, jiraSearchEndpoint: '/rest/api/3/search/jql' });
    return;
  }

  if (requestUrl.pathname === '/api/version') {
    sendJson(response, 200, {
      app: 'qa-ai-framework-showcase-api',
      jiraSearchEndpoint: '/rest/api/3/search/jql',
      deprecatedSearchEndpointEnabled: false,
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/jira/config') {
    sendJson(response, 200, getJiraConfig());
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/jira/tickets') {
    try {
      await assertJiraAuth();
      const tickets = await readQaAssistantTickets();
      sendJson(response, 200, { source: jiraEmail && jiraApiToken ? 'jira' : 'local-json', tickets });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to read Jira tickets' });
    }

    return;
  }

  if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/jira/tickets/')) {
    try {
      const ticketKey = decodeURIComponent(requestUrl.pathname.replace('/api/jira/tickets/', ''));
      const ticket = await readQaAssistantTicket(ticketKey);
      sendJson(response, 200, { ticket });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to read Jira ticket' });
    }

    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/qa/analyze-ticket') {
    try {
      const body = await readRequestJson(request);
      const ticket = body?.ticketKey ? await readQaAssistantTicket(body.ticketKey) : normalizeAssistantTicket(body?.ticket);
      const analysis = await buildQaAssistantAnalysis(ticket);
      sendJson(response, 200, { analysis });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to analyze ticket' });
    }

    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/qa/generate-test-cases') {
    try {
      const body = await readRequestJson(request);
      const ticket = body?.ticketKey ? await readQaAssistantTicket(body.ticketKey) : normalizeAssistantTicket(body?.ticket);
      sendJson(response, 200, { testCases: generateManualTestCases(ticket) });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to generate test cases' });
    }

    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/qa/generate-playwright-script') {
    try {
      const body = await readRequestJson(request);
      const ticket = body?.ticketKey ? await readQaAssistantTicket(body.ticketKey) : normalizeAssistantTicket(body?.ticket);
      const analysis = await buildQaAssistantAnalysis(ticket);
      const script = await generatePendingAssistantScript(ticket, analysis);
      sendJson(response, 200, { script, approval_required: true });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to generate Playwright script' });
    }

    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/qa/approve-generated-script') {
    try {
      const body = await readRequestJson(request);
      const result = await approveGeneratedAssistantScript(body?.fileName, body?.module);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to approve generated script' });
    }

    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/jira/dev-qa-tickets') {
    try {
      assertJiraConfig();
      await assertJiraAuth();

      const projectKey = requestUrl.searchParams.get('projectKey') ?? jiraDefaults.projectKey;
      const assignees = splitCsv(requestUrl.searchParams.get('assignees')) || jiraDefaults.assignees;
      const boardId = requestUrl.searchParams.get('boardId') ?? jiraDefaults.boardId;
      const status = requestUrl.searchParams.get('status') ?? jiraDefaults.status;
      const maxResults = Math.min(Number(requestUrl.searchParams.get('maxResults') || 500), 1000);
      const jql = buildTicketSearchJql({ projectKey, status });
      const data = await searchJiraTickets({
        jql,
        maxResults,
        fields: ['summary', 'status', 'assignee', 'issuetype', 'priority', 'created', 'updated'],
      });
      const issues = data.issues || [];
      const filteredIssues = filterIssuesByAssignees(issues, assignees);

      sendJson(response, 200, {
        ...getJiraConfig({ projectKey, boardId, status, assignees }),
        projectKey,
        boardId,
        status,
        assignees,
        jql,
        fetchedTotal: data.total || issues.length,
        qaTotal: filteredIssues.length,
        total: issues.length,
        tickets: issues.map(normalizeIssue),
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: error.message || 'Failed to fetch Jira tickets',
      });
    }

    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/playwright/tags') {
    sendJson(response, 200, { tags: [...allowedPlaywrightTags] });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/playwright/report') {
    sendJson(response, 200, readPlaywrightReportSummary());
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/playwright/run') {
    try {
      const body = await readRequestJson(request);
      const grep = validatePlaywrightGrep(body?.grep || '@smoke');
      const result = await runPlaywright(grep);

      sendJson(response, result.exitCode === 0 ? 200 : 500, result);
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: error.message || 'Failed to run Playwright',
      });
    }

    return;
  }

  sendJson(response, 404, { error: 'Not found' });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing API process or set API_PORT to a different value.`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, () => {
  console.log(`Jira API server running on http://localhost:${PORT}`);
  console.log(`Jira site: ${jiraBaseUrl}`);
  console.log('Jira search endpoint: /rest/api/3/search/jql');
  console.log(`Default scope: ${describeScope(jiraDefaults)}`);
});

function normalizeBaseUrl(value) {
  return value ? value.replace(/\/$/, '') : '';
}

function assertJiraConfig() {
  const missing = [];

  if (!jiraEmail) missing.push('JIRA_EMAIL');
  if (!jiraApiToken) missing.push('JIRA_API_TOKEN');

  if (missing.length > 0) {
    const error = new Error(`Missing Jira environment variables: ${missing.join(', ')}`);
    error.statusCode = 500;
    throw error;
  }
}

function getJiraConfig(overrides = {}) {
  const config = {
    projectKey: overrides.projectKey || jiraDefaults.projectKey,
    boardId: overrides.boardId || jiraDefaults.boardId,
    status: overrides.status || jiraDefaults.status,
    assignees: overrides.assignees || jiraDefaults.assignees,
  };

  return {
    ...config,
    siteUrl: jiraBaseUrl,
    projectUrl: config.projectKey ? `${jiraBaseUrl}/jira/software/projects/${config.projectKey}` : '',
    boardUrl: config.projectKey && config.boardId ? `${jiraBaseUrl}/jira/software/projects/${config.projectKey}/boards/${config.boardId}` : '',
  };
}

function buildTicketSearchJql({ projectKey, status }) {
  if (!projectKey && !status) {
    return `${jiraTicketScopes.map(buildScopedProjectJql).join(' OR ')} ORDER BY updated DESC`;
  }

  const clauses = [];

  if (projectKey) {
    clauses.push(`project = ${escapeJqlValue(projectKey)}`);
  }

  if (status) {
    clauses.push(`status = "${escapeJqlString(status)}"`);
  }

  return `${clauses.length ? clauses.join(' AND ') : 'issuekey is not EMPTY'} ORDER BY updated DESC`;
}

function buildScopedProjectJql(scope) {
  const statusClause = scope.statuses.map((scopeStatus) => `"${escapeJqlString(scopeStatus)}"`).join(', ');
  return `(project = ${escapeJqlValue(scope.project)} AND status in (${statusClause}))`;
}

function describeScope({ projectKey, boardId, status, assignees }) {
  const parts = [];

  if (projectKey) parts.push(`project ${projectKey}`);
  if (boardId) parts.push(`board ${boardId}`);
  if (status) parts.push(`status ${status}`);
  if (assignees?.length) parts.push(`assignees ${assignees.join(', ')}`);

  return parts.length ? parts.join(' / ') : 'all Jira tickets';
}

async function jiraFetch(path, options = {}) {
  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
  const response = await fetch(`${jiraBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Jira API failed (${response.status}): ${details}`);
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

async function assertJiraAuth() {
  if (!jiraEmail || !jiraApiToken) {
    return;
  }

  const auth = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');
  const response = await fetch(`${jiraBaseUrl}/rest/api/3/myself`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = new Error(`Jira authentication failed for ${jiraEmail}. Check JIRA_EMAIL and JIRA_API_TOKEN, and make sure this Jira account can browse EGO App and VSF2.`);
    error.statusCode = response.status;
    throw error;
  }
}

async function searchJiraTickets({ jql, fields, maxResults = 500 }) {
  const issues = [];
  let nextPageToken = '';
  let total = 0;

  do {
    const pageSize = Math.min(100, maxResults - issues.length);
    const searchParams = new URLSearchParams({
      jql,
      maxResults: String(pageSize),
      fields: fields.join(','),
    });

    if (nextPageToken) {
      searchParams.set('nextPageToken', nextPageToken);
    }

    const data = await jiraFetch(`/rest/api/3/search/jql?${searchParams.toString()}`);
    const pageIssues = data.issues || [];
    issues.push(...pageIssues);
    total = data.total || Math.max(total, issues.length);
    nextPageToken = data.nextPageToken || '';

    if (!pageIssues.length) {
      break;
    }
  } while (nextPageToken && issues.length < maxResults);

  return { total, issues };
}

function filterIssuesByAssignees(issues, assignees) {
  if (!assignees?.length) {
    return issues;
  }

  return issues.filter((issue) => {
    const assignee = issue.fields?.assignee;
    const haystack = [
      assignee?.displayName,
      assignee?.emailAddress,
      assignee?.name,
      assignee?.accountId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return assignees.some((name) => haystack.includes(name.toLowerCase()));
  });
}

function normalizeIssue(issue) {
  return {
    key: issue.key,
    url: `${jiraBaseUrl}/browse/${issue.key}`,
    summary: issue.fields?.summary || '',
    status: issue.fields?.status?.name || '',
    type: issue.fields?.issuetype?.name || '',
    priority: issue.fields?.priority?.name || 'None',
    assignee: issue.fields?.assignee?.displayName || 'Unassigned',
    created: issue.fields?.created || '',
    updated: issue.fields?.updated || '',
  };
}

async function readQaAssistantTickets() {
  if (!jiraEmail || !jiraApiToken) {
    return [normalizeLocalAssistantTicket()];
  }

  const data = await searchJiraTickets({
    jql: buildTicketSearchJql({ projectKey: '', status: '' }),
    maxResults: Number(process.env.JIRA_TICKET_FETCH_LIMIT || 500),
    fields: ['summary', 'description', 'comment', 'status', 'priority', 'assignee', 'reporter', 'labels', 'components', 'issuetype', 'created', 'updated'],
  });

  return (data.issues || []).map(normalizeAssistantIssue);
}

async function readQaAssistantTicket(ticketKey) {
  if (!jiraEmail || !jiraApiToken || ticketKey === 'LOCAL-SAMPLE') {
    return normalizeLocalAssistantTicket();
  }

  const issue = await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(ticketKey)}?fields=summary,description,comment,status,priority,assignee,reporter,labels,components,issuetype,created,updated`);
  return normalizeAssistantIssue(issue);
}

function normalizeAssistantTicket(ticket) {
  if (!ticket?.key) {
    const error = new Error('Missing ticket payload');
    error.statusCode = 400;
    throw error;
  }

  return ticket;
}

function normalizeLocalAssistantTicket() {
  const sample = JSON.parse(readFileSync(resolve(process.cwd(), 'samples/jira-ticket.json'), 'utf8'));

  return {
    key: sample.ticket_id,
    title: sample.title,
    description: sample.description,
    acceptanceCriteria: sample.acceptance_criteria || [],
    status: 'Local Sample',
    priority: sample.priority,
    assignee: sample.assigned_to,
    reporter: 'Local JSON',
    labels: ['mock-ai', 'local-json'],
    components: splitCsv(sample.component) || [],
    issueType: 'Story',
    environment: sample.environment,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    comments: [
      {
        id: 'local-comment-1',
        author: 'Local QA Context',
        body: 'Use Jira comments to capture QA notes, developer clarifications, scope changes, known risks, and release instructions.',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
  };
}

function normalizeAssistantIssue(issue) {
  const fields = issue.fields || {};

  return {
    key: issue.key,
    title: fields.summary || '',
    description: extractJiraText(fields.description),
    acceptanceCriteria: extractAcceptanceCriteria(fields.description),
    status: fields.status?.name || '',
    priority: fields.priority?.name || 'None',
    assignee: fields.assignee?.displayName || 'Unassigned',
    reporter: fields.reporter?.displayName || '',
    labels: fields.labels || [],
    components: (fields.components || []).map((component) => component.name),
    issueType: fields.issuetype?.name || '',
    environment: process.env.DEFAULT_TEST_ENV || 'CF',
    created: fields.created || '',
    updated: fields.updated || '',
    comments: normalizeJiraComments(fields.comment?.comments || []),
    url: `${jiraBaseUrl}/browse/${issue.key}`,
  };
}

async function buildQaAssistantAnalysis(ticket) {
  const coverage = await analyzeAssistantCoverage(ticket);
  const tags = recommendAssistantTags(ticket);
  const risk = resolveAssistantRisk(ticket);
  const module = resolveAssistantModule(tags);

  return {
    ticket_key: ticket.key,
    title: ticket.title,
    issue_type: ticket.issueType,
    business_summary: `${ticket.title} impacts ${ticket.components.join(', ') || 'the product experience'}.`,
    qa_summary: `Validate ${ticket.key} on ${ticket.environment} for ${ticket.assignee}.`,
    risk_level: risk.level,
    risk_score: risk.score,
    impacted_modules: ticket.components.length ? ticket.components : ['General UI'],
    assumptions: ['Mock AI mode is active.', 'Acceptance criteria are extracted from Jira description or local JSON.'],
    dependencies: ['Jira ticket quality', 'Stable QA environment', 'Existing Playwright page objects'],
    comment_insights: extractCommentInsights(ticket),
    test_environment: ticket.environment,
    how_to_test: {
      what_is_changing: ticket.description || ticket.title,
      why_it_matters: 'This can affect customer journey quality, conversion, and regression stability.',
      preconditions: [`${ticket.environment} is reachable`, 'Required QA test data exists', 'Known non-auth popups can be dismissed', ...extractCommentInsights(ticket).filter((item) => /env|environment|setup|precondition/i.test(item))],
      test_data_needed: ['QA customer account if needed', 'Product/search/cart data relevant to the ticket', ...extractCommentInsights(ticket).filter((item) => /data|user|account|product|sku|order/i.test(item))],
      test_environment: ticket.environment,
      step_by_step: ticket.acceptanceCriteria.map((criterion, index) => `${index + 1}. Validate: ${criterion}`),
      positive_scenarios: ticket.acceptanceCriteria.map((criterion) => `Confirm expected behavior: ${criterion}`),
      negative_scenarios: ['Validate missing/invalid inputs.', 'Validate empty/unavailable states.', 'Validate no false success state appears.'],
      edge_cases: ['Repeat the flow twice.', 'Refresh during or after the flow.', 'Use boundary input values where applicable.'],
      regression_areas: ticket.components.length ? ticket.components : ['Smoke flow', 'UI shell'],
      ui_checks: ['Verify labels, buttons, modals, validation messages, loading states, and icons.'],
      api_data_checks: ['Verify UI state matches product/order/customer data where applicable.'],
      mobile_responsive_checks: ['Repeat core journey on mobile viewport and verify drawers/header remain usable.'],
      accessibility_checks: ['Verify keyboard focus order and visible/readable validation messages.'],
      risks_and_watchouts: ['Do not automate captcha/Cloudflare bypass.', 'Third-party payment/destructive actions may be manual-only.', ...extractCommentInsights(ticket).filter((item) => /risk|block|issue|bug|known|watch|careful/i.test(item))],
    },
    manual_test_cases: generateManualTestCases(ticket),
    regression_impact: ticket.components.map((component) => `Regression risk in ${component}`),
    automation_recommendation: coverage.some((gap) => gap.coverage_status === 'Missing') ? 'Approve generated Playwright coverage after review.' : 'Reuse or patch existing tagged coverage.',
    existing_coverage: coverage,
    missing_coverage: coverage.filter((gap) => gap.coverage_status !== 'Covered'),
    suggested_playwright_script: {
      suggested_file_path: `generated-tests/pending/${ticket.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.spec.ts`,
      module,
      tags,
      risk_level: risk.level,
      generated_code: '',
      requires_human_review: true,
      assumptions: ['Review generated selectors before approval.'],
    },
    approval_required: true,
  };
}

function generateManualTestCases(ticket) {
  const componentTags = ticket.components.map((component) => component.toLowerCase().replace(/\s+/g, '-'));

  return [
    ...ticket.acceptanceCriteria.map((criterion, index) => ({
      id: `${ticket.key}-TC-${String(index + 1).padStart(3, '0')}`,
      title: criterion,
      priority: ticket.priority,
      type: 'Functional',
      preconditions: [`${ticket.environment} is available`, 'QA user can access the impacted flow'],
      steps: [`Open ${ticket.components.join(', ') || 'the impacted module'}`, `Perform: ${criterion}`, 'Observe UI/data changes'],
      expected_result: criterion,
      test_data: ['QA account if required', 'Valid product/customer data'],
      tags: ['functional', ...componentTags],
    })),
    {
      id: `${ticket.key}-TC-NEG-001`,
      title: 'Validate invalid or missing required data',
      priority: ticket.priority,
      type: 'Negative',
      preconditions: [`${ticket.environment} is available`],
      steps: ['Open impacted flow', 'Skip or enter invalid required data', 'Submit/continue'],
      expected_result: 'Clear validation appears and no incorrect success state is created.',
      test_data: ['Missing values', 'Invalid values'],
      tags: ['negative', ...componentTags],
    },
  ];
}

async function analyzeAssistantCoverage(ticket) {
  const tests = await readExistingPlaywrightTests();
  const tags = new Set(tests.flatMap((test) => test.tags));

  return ticket.acceptanceCriteria.map((criterion) => {
    const recommendedTags = recommendTagsForText(criterion);
    const matchedTests = tests.filter((test) => recommendedTags.some((tag) => test.tags.includes(tag))).map((test) => test.title);
    const matchedTags = recommendedTags.filter((tag) => tags.has(tag));
    const coverageStatus = matchedTests.length && matchedTags.length === recommendedTags.length ? 'Covered' : matchedTests.length ? 'Partially Covered' : 'Missing';

    return {
      acceptance_criterion: criterion,
      coverage_status: /captcha|cloudflare|legal|manual approval/i.test(criterion) ? 'Manual Only' : coverageStatus,
      matched_tests: matchedTests,
      missing_scenarios: matchedTests.length ? [`Add assertion depth for: ${criterion}`] : [`Create automation for: ${criterion}`],
      recommended_tags: recommendedTags,
      automation_priority: recommendedTags.includes('@payment') || recommendedTags.includes('@checkout') ? 'High' : 'Medium',
    };
  });
}

async function readExistingPlaywrightTests() {
  const testRoot = resolve(process.cwd(), 'tests/e2e');
  const files = await collectSpecFiles(testRoot);
  const tests = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const tags = [...new Set(content.match(/@[a-zA-Z0-9_-]+/g) || [])];
    const titleMatches = [...content.matchAll(/test(?:\.describe)?\(['"`]([^'"`]+)/g)].map((match) => match[1]);
    tests.push({ file, title: titleMatches.join(' | ') || file, tags });
  }

  return tests;
}

async function collectSpecFiles(directory) {
  if (!existsSync(directory)) return [];
  const { readdirSync, statSync } = await import('node:fs');
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry);
    if (statSync(entryPath).isDirectory()) files.push(...(await collectSpecFiles(entryPath)));
    if (entry.endsWith('.spec.ts')) files.push(entryPath);
  }

  return files;
}

async function generatePendingAssistantScript(ticket, analysis) {
  const fileName = `${ticket.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.spec.ts`;
  const pendingPath = resolve(process.cwd(), 'generated-tests/pending', fileName);
  const code = createAssistantSpec(ticket, analysis);
  const { mkdirSync, writeFileSync } = await import('node:fs');
  mkdirSync(resolve(process.cwd(), 'generated-tests/pending'), { recursive: true });
  writeFileSync(pendingPath, code, 'utf8');

  return {
    suggested_file_path: `generated-tests/pending/${fileName}`,
    module: analysis.suggested_playwright_script.module,
    tags: analysis.suggested_playwright_script.tags,
    risk_level: analysis.risk_level,
    generated_code: code,
    requires_human_review: true,
    assumptions: ['Generated script requires human review before insertion.', 'Selectors should be validated against the current site.'],
  };
}

async function approveGeneratedAssistantScript(fileName, moduleName) {
  if (!fileName || !moduleName) {
    const error = new Error('fileName and module are required for approval');
    error.statusCode = 400;
    throw error;
  }

  const safeModule = validateAssistantModule(moduleName);
  const safeFile = fileName.replace(/[^a-zA-Z0-9_.-]/g, '');
  const source = resolve(process.cwd(), 'generated-tests/pending', safeFile);
  const target = resolve(process.cwd(), 'tests/e2e', safeModule, safeFile);
  const { mkdirSync, copyFileSync, existsSync: exists } = await import('node:fs');

  if (!exists(source)) {
    const error = new Error(`Pending script not found: ${safeFile}`);
    error.statusCode = 404;
    throw error;
  }

  mkdirSync(resolve(process.cwd(), 'tests/e2e', safeModule), { recursive: true });
  copyFileSync(source, target);
  return { approved: true, source: `generated-tests/pending/${safeFile}`, target: `tests/e2e/${safeModule}/${safeFile}` };
}

function createAssistantSpec(ticket, analysis) {
  const tags = analysis.suggested_playwright_script.tags.join(' ');
  const title = ticket.title.replace(/'/g, "\\'");

  return `import { expect, test } from '../../../fixtures/testFixture';
import { SearchPage } from '../../../pages/SearchPage';
import { ProductPage } from '../../../pages/ProductPage';
import { CartPage } from '../../../pages/CartPage';

test.describe('${ticket.key} ${title}', () => {
  test('${tags} validates Jira ticket acceptance criteria', async ({ homePage, page }) => {
    await homePage.goto();

    const searchPage = new SearchPage(page);
    await searchPage.search('heels');
    await searchPage.expectResults();

    await page.getByRole('link').filter({ hasText: /heel|shoe|sandal|boot/i }).first().click();

    const productPage = new ProductPage(page);
    await productPage.expectProductVisible();

    const sizeOption = page.getByRole('button', { name: /3|4|5|6|7|8|small|medium|large/i }).first();
    if (await sizeOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sizeOption.click();
    }

    await page.getByRole('button', { name: /add to bag|add to basket|add to cart/i }).click();

    const cartPage = new CartPage(page);
    await cartPage.expectCartSurface();
    await expect(page.locator('body')).toContainText(/bag|basket|cart|added|checkout/i);
  });
});
`;
}

function recommendAssistantTags(ticket) {
  return recommendTagsForText(`${ticket.title} ${ticket.description} ${ticket.comments.map((comment) => comment.body).join(' ')} ${ticket.components.join(' ')} ${ticket.priority}`);
}

function recommendTagsForText(value) {
  const text = value.toLowerCase();
  const tags = new Set(['@regression', '@ui']);
  if (/search|keyword|result/.test(text)) tags.add('@search');
  if (/cart|bag|basket/.test(text)) tags.add('@cart');
  if (/checkout|delivery/.test(text)) tags.add('@checkout');
  if (/payment|card|paypal/.test(text)) tags.add('@payment');
  if (/login|account|auth/.test(text)) tags.add('@login');
  if (/register|registration/.test(text)) tags.add('@register');
  if (/high|critical|smoke/.test(text)) tags.add('@smoke');
  return [...tags];
}

function resolveAssistantRisk(ticket) {
  const text = `${ticket.priority} ${ticket.title} ${ticket.comments.map((comment) => comment.body).join(' ')} ${ticket.components.join(' ')}`.toLowerCase();
  if (/payment|checkout|critical/.test(text)) return { level: 'Critical', score: 95 };
  if (/high|cart|bag|login/.test(text)) return { level: 'High', score: 80 };
  if (/search|product/.test(text)) return { level: 'Medium', score: 55 };
  return { level: 'Low', score: 25 };
}

function normalizeJiraComments(comments) {
  return comments.map((comment) => ({
    id: comment.id || '',
    author: comment.author?.displayName || 'Unknown',
    body: extractJiraText(comment.body),
    created: comment.created || '',
    updated: comment.updated || '',
  })).filter((comment) => comment.body);
}

function extractCommentInsights(ticket) {
  const insights = (ticket.comments || [])
    .map((comment) => `${comment.author}: ${comment.body}`)
    .filter((comment) => /qa|test|verify|risk|block|env|data|scope|fix|release|regression|automation|playwright/i.test(comment))
    .slice(0, 6);

  return insights.length ? insights : ['No actionable Jira comments found. Use ticket description and acceptance criteria as the main QA source.'];
}

function resolveAssistantModule(tags) {
  if (tags.includes('@checkout') || tags.includes('@payment')) return 'checkout';
  if (tags.includes('@cart')) return 'cart';
  if (tags.includes('@search')) return 'search';
  if (tags.includes('@login') || tags.includes('@register')) return 'auth';
  return 'smoke';
}

function validateAssistantModule(moduleName) {
  const allowed = new Set(['smoke', 'auth', 'search', 'cart', 'checkout']);
  if (!allowed.has(moduleName)) {
    const error = new Error(`Unsupported module: ${moduleName}`);
    error.statusCode = 400;
    throw error;
  }
  return moduleName;
}

async function jiraFetchPost(path, body) {
  return jiraFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function extractJiraText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(extractJiraText).filter(Boolean).join(' ');
  return '';
}

function extractAcceptanceCriteria(node) {
  const text = extractJiraText(node);
  const items = text.split(/\n|•|- /).map((item) => item.trim()).filter((item) => /should|must|can|verify|given|when|then/i.test(item));
  return items.length ? items : ['Acceptance criteria not found. Validate the ticket summary, description, and QA notes.'];
}

function escapeJqlValue(value) {
  return /^[A-Z0-9_-]+$/i.test(value) ? value : `"${escapeJqlString(value)}"`;
}

function escapeJqlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function splitCsv(value) {
  const values = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return values?.length ? values : null;
}

function validatePlaywrightGrep(value) {
  const grep = String(value).trim();
  const tags = grep.split(/\s+/).filter(Boolean);

  if (!tags.length || tags.some((tag) => !allowedPlaywrightTags.has(tag))) {
    const error = new Error(`Unsupported Playwright tag filter: ${grep}`);
    error.statusCode = 400;
    throw error;
  }

  return tags.join('|');
}

function runPlaywright(grep) {
  if (activePlaywrightRun) {
    const error = new Error('A Playwright run is already in progress');
    error.statusCode = 409;
    throw error;
  }

  return new Promise((resolveRun) => {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const startedAt = new Date().toISOString();
    const child = spawn(command, ['playwright', 'test', '--grep', grep], {
      cwd: process.cwd(),
      env: process.env,
      shell: false,
    });
    activePlaywrightRun = child;
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (exitCode) => {
      activePlaywrightRun = null;
      resolveRun({
        grep,
        exitCode,
        passed: exitCode === 0,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: stdout.slice(-8000),
        stderr: stderr.slice(-8000),
        report: readPlaywrightReportSummary(),
      });
    });
  });
}

function readPlaywrightReportSummary() {
  const reportPath = resolve(process.cwd(), 'reports/playwright/results.json');

  if (!existsSync(reportPath)) {
    return {
      exists: false,
      reportPath: 'reports/playwright/results.json',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const specs = collectSpecs(report.suites || []);
  const summary = specs.reduce(
    (totals, spec) => {
      for (const test of spec.tests || []) {
        const status = test.status || test.outcome || test.results?.at(-1)?.status || 'unknown';
        totals.total += 1;
        if (status === 'expected' || status === 'passed') totals.passed += 1;
        if (status === 'unexpected' || status === 'failed' || status === 'timedOut') totals.failed += 1;
        if (status === 'skipped') totals.skipped += 1;
      }

      return totals;
    },
    { exists: true, reportPath: 'reports/playwright/results.json', total: 0, passed: 0, failed: 0, skipped: 0 },
  );

  return summary;
}

function collectSpecs(suites) {
  return suites.flatMap((suite) => [...(suite.specs || []), ...collectSpecs(suite.suites || [])]);
}

function readRequestJson(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk.toString();
    });

    request.on('end', () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        const error = new Error('Invalid JSON request body');
        error.statusCode = 400;
        rejectBody(error);
      }
    });

    request.on('error', rejectBody);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
}
