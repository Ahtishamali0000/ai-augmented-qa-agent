import http from 'node:http';
import { URL } from 'node:url';
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
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
const environmentCatalog = [
  ['CF_UK', 'CF UK', process.env.CF_UK_URL || 'https://cfstaging.ego.co.uk/'],
  ['CF_US', 'CF US', process.env.CF_US_URL || 'https://cfstaging.egoshoes.com/us'],
  ['CF_EU', 'CF EU', process.env.CF_EU_URL || 'https://cfstaging.egoshoes.com/eu'],
  ['UAT1_UK', 'UAT1 UK', process.env.UAT1_UK_URL || 'https://cf-uat1.ego.co.uk/'],
  ['UAT1_US', 'UAT1 US', process.env.UAT1_US_URL || 'https://cf-uat1.egoshoes.com/us'],
  ['UAT1_EU', 'UAT1 EU', process.env.UAT1_EU_URL || 'https://cf-uat1.egoshoes.com/eu'],
].map(([id, name, url]) => ({ id, name, url }));
let activePlaywrightRun = null;
const activeRecordings = new Map();
const recorderEventClients = new Map();

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

  if (request.method === 'GET' && requestUrl.pathname === '/api/environments') {
    sendJson(response, 200, { environments: environmentCatalog });
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

  if (request.method === 'POST' && ['/api/qa/analyze-ticket', '/api/jira/analyze-ticket'].includes(requestUrl.pathname)) {
    try {
      const body = await readRequestJson(request);
      const ticket = body?.ticketKey ? await readQaAssistantTicket(body.ticketKey) : normalizeAssistantTicket(body?.ticket);
      applySelectedEnvironment(ticket, body?.environment);
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
      applySelectedEnvironment(ticket, body?.environment);
      const analysis = await buildQaAssistantAnalysis(ticket);
      const script = await generatePendingAssistantScript(ticket, analysis);
      sendJson(response, 200, { script, approval_required: true });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to generate Playwright script' });
    }

    return;
  }

  if (request.method === 'POST' && ['/api/qa/generate-passed-comment', '/api/jira/generate-signoff-comment'].includes(requestUrl.pathname)) {
    try {
      const body = await readRequestJson(request);
      const ticket = body?.ticketKey ? await readQaAssistantTicket(body.ticketKey) : normalizeAssistantTicket(body?.ticket);
      applySelectedEnvironment(ticket, body?.environment);
      const analysis = body?.analysis || await buildQaAssistantAnalysis(ticket);
      if (body?.environment && analysis) analysis.test_environment = ticket.environment;
      const comment = buildPassedQaComment(ticket, analysis);
      sendJson(response, 200, { comment });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to generate QA comment' });
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

  if (request.method === 'POST' && requestUrl.pathname === '/api/recorder/start') {
    try {
      const body = await readRequestJson(request);
      const recording = await startLiveRecorder(body);
      sendJson(response, 200, publicRecording(recording));
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to start recorder' });
    }

    return;
  }

  const recorderRoute = requestUrl.pathname.match(/^\/api\/recorder\/([^/]+)\/([^/]+)$/);
  if (recorderRoute) {
    const [, recordingId, command] = recorderRoute;
    try {
      if (request.method === 'POST' && command === 'pause') {
        const recording = getActiveRecording(recordingId);
        recording.status = 'paused';
        recording.pausedAt = new Date().toISOString();
        persistRecording(recording);
        emitRecorderEvent(recording.id, { type: 'recording_paused', status: recording.status });
        sendJson(response, 200, publicRecording(recording));
        return;
      }

      if (request.method === 'POST' && command === 'resume') {
        const recording = getActiveRecording(recordingId);
        recording.status = 'recording';
        recording.pausedAt = '';
        persistRecording(recording);
        emitRecorderEvent(recording.id, { type: 'recording_resumed', status: recording.status });
        sendJson(response, 200, publicRecording(recording));
        return;
      }

      if (request.method === 'POST' && command === 'stop') {
        const recording = await stopLiveRecorder(recordingId);
        sendJson(response, 200, publicRecording(recording));
        return;
      }

      if (request.method === 'GET' && command === 'status') {
        sendJson(response, 200, publicRecording(getActiveRecording(recordingId)));
        return;
      }

      if (request.method === 'GET' && command === 'actions') {
        const recording = getActiveRecording(recordingId);
        sendJson(response, 200, { recordingId, actions: recording.actions });
        return;
      }

      if (request.method === 'PUT' && command === 'actions') {
        const recording = getActiveRecording(recordingId);
        const body = await readRequestJson(request);
        recording.actions = normalizeRecordedActionList(body?.actions || []);
        refreshRecordingDraft(recording);
        persistRecording(recording);
        sendJson(response, 200, { recordingId, actions: recording.actions, draft: recording.draft });
        return;
      }

      if (request.method === 'GET' && command === 'generated-files') {
        const recording = getActiveRecording(recordingId);
        sendJson(response, 200, readRecorderGeneratedFiles(recording));
        return;
      }

      if (request.method === 'POST' && command === 'finalize') {
        const body = await readRequestJson(request);
        const recording = finalizeRecorderDraft(recordingId, body);
        sendJson(response, 200, { recordingId, draft: recording.draft, validation: recording.validation });
        return;
      }

      if (request.method === 'POST' && command === 'approve') {
        const body = await readRequestJson(request);
        const result = approveRecorderAutomationDraft(recordingId, body);
        sendJson(response, 200, result);
        return;
      }

      if (request.method === 'POST' && command === 'reject') {
        const recording = getActiveRecording(recordingId);
        recording.status = 'rejected';
        persistRecording(recording);
        emitRecorderEvent(recording.id, { type: 'recording_rejected', status: recording.status });
        sendJson(response, 200, { rejected: true, recordingId });
        return;
      }
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || `Recorder ${command} failed` });
      return;
    }
  }

  if (request.method === 'GET' && requestUrl.pathname.match(/^\/api\/recorder\/[^/]+\/events$/)) {
    const recordingId = requestUrl.pathname.split('/')[3];
    streamRecorderEvents(request, response, recordingId);
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/recorder/generate') {
    try {
      const body = await readRequestJson(request);
      const draft = generateRecorderAutomationDraft(body);
      sendJson(response, 200, { draft, approval_required: true });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to generate recorder automation' });
    }

    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/recorder/approve') {
    try {
      const body = await readRequestJson(request);
      const result = approveRecorderAutomationDraft(body?.recordingId);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to approve recorder automation' });
    }

    return;
  }

  if (request.method === 'POST' && requestUrl.pathname.startsWith('/api/jira/tickets/') && requestUrl.pathname.endsWith('/comments')) {
    try {
      assertJiraConfig();
      await assertJiraAuth();
      const ticketKey = decodeURIComponent(requestUrl.pathname.replace('/api/jira/tickets/', '').replace('/comments', ''));
      const body = await readRequestJson(request);
      const result = await addJiraComment(ticketKey, body?.comment);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to add Jira comment' });
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

  if (request.method === 'GET' && requestUrl.pathname === '/api/test-runs/latest') {
    sendJson(response, 200, readJsonArtifact('reports/run-summary.json', {
      generatedAt: null,
      totals: { total: 0, passed: 0, failed: 0, skipped: 0 },
      results: [],
    }));
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/test-runs/live') {
    const streamPath = resolve(process.cwd(), 'reports/ndjson/live-output.ndjson');
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-ndjson; charset=utf-8',
    });
    response.end(existsSync(streamPath) ? readFileSync(streamPath) : '');
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/test-runs/failures') {
    sendJson(response, 200, readJsonArtifact('reports/failures/failure-triage.json', []));
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/test-runs/reports') {
    sendJson(response, 200, reportCatalog());
    return;
  }

  if (request.method === 'GET' && ['/api/test-runs/inventory', '/api/tests/inventory'].includes(requestUrl.pathname)) {
    sendJson(response, 200, readTestInventory());
    return;
  }

  if (request.method === 'GET' && ['/api/reports/latest', '/api/reports/allure', '/api/reports/playwright'].includes(requestUrl.pathname)) {
    const reports = reportCatalog();
    if (requestUrl.pathname === '/api/reports/latest') sendJson(response, 200, reports);
    if (requestUrl.pathname === '/api/reports/allure') sendJson(response, 200, reports.allureReport);
    if (requestUrl.pathname === '/api/reports/playwright') {
      sendJson(response, 200, { html: reports.playwrightHtml, json: reports.playwrightJson });
    }
    return;
  }

  const artifactRoute = [
    ['allure', 'reports/allure-report'],
    ['playwright', 'reports/playwright/html'],
    ['json', 'reports/playwright'],
    ['markdown', 'reports/markdown'],
    ['excel', 'reports/excel'],
    ['evidence', 'reports/playwright/artifacts'],
  ].find(([route]) => requestUrl.pathname.startsWith(`/api/test-runs/artifacts/${route}`));
  if (request.method === 'GET' && artifactRoute) {
    sendReportArtifact(response, requestUrl.pathname, artifactRoute[0], artifactRoute[1]);
    return;
  }

  if (request.method === 'POST' && ['/api/test-runs/run', '/api/tests/run-suite'].includes(requestUrl.pathname)) {
    try {
      const body = await readRequestJson(request);
      const result = await runBddPipeline(body);
      sendJson(response, result.exitCode === 0 ? 200 : 500, result);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to run BDD pipeline' });
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/tests/run-specific') {
    try {
      const body = await readRequestJson(request);
      const inventory = readTestInventory();
      const item = inventory.items.find((candidate) => candidate.id === body?.testId || candidate.scenario === body?.testName);
      if (!item) {
        const error = new Error('The selected test no longer exists in the project inventory');
        error.statusCode = 404;
        throw error;
      }
      if (item.source === 'pending') {
        const error = new Error('Pending tests must be approved before execution');
        error.statusCode = 400;
        throw error;
      }
      const result = item.framework === 'BDD'
        ? await runBddPipeline({ ...body, suite: 'specific', testName: item.scenario })
        : await runPlaywrightSpecific(item, body);
      sendJson(response, result.exitCode === 0 ? 200 : 500, { ...result, testName: item.scenario });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to run selected test' });
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/test-runs/rerun-failed') {
    try {
      const body = await readRequestJson(request);
      const runOptions = validatePlaywrightRunOptions(body);
      const result = await runLastFailed(runOptions);
      sendJson(response, result.exitCode === 0 ? 200 : 500, result);
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message || 'Failed to rerun failed tests' });
    }
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/playwright/run') {
    try {
      const body = await readRequestJson(request);
      const grep = validatePlaywrightGrep(body?.grep || '@smoke');
      const runOptions = validatePlaywrightRunOptions(body);
      const result = await runPlaywright(grep, runOptions);

      sendJson(response, result.exitCode === 0 ? 200 : 500, {
        ...result,
        error: result.exitCode === 0 ? undefined : result.stderr || 'Playwright run failed',
      });
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
    automation_recommendation: [
      coverage.some((gap) => gap.coverage_status === 'Missing') ? 'Approve generated Playwright coverage after review.' : 'Reuse or patch existing tagged coverage.',
      /order|checkout|payment/i.test(`${ticket.title} ${ticket.description}`) && !String(ticket.environment).startsWith('UAT1')
        ? 'Use UAT1 for placed-order or payment scenarios.'
        : '',
    ].filter(Boolean).join(' '),
    existing_coverage: coverage,
    missing_coverage: coverage.filter((gap) => gap.coverage_status !== 'Covered'),
    suggested_playwright_script: {
      suggested_file_path: `generated-tests/pending/${ticket.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.feature`,
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
  const fileName = `${ticket.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.feature`;
  const pendingPath = resolve(process.cwd(), 'generated-tests/pending', fileName);
  const code = createAssistantFeature(ticket, analysis);
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
    assumptions: ['Generated feature requires human review before insertion.', 'Implement missing step and POM methods before removing @skip.'],
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
  if (!safeFile.endsWith('.feature')) {
    const error = new Error('Only reviewed .feature files can enter the BDD framework');
    error.statusCode = 400;
    throw error;
  }
  const source = resolve(process.cwd(), 'generated-tests/pending', safeFile);
  const featureModule = safeModule === 'smoke' ? 'homepage' : safeModule;
  const target = resolve(process.cwd(), 'features', featureModule, safeFile);
  const { mkdirSync, copyFileSync, existsSync: exists } = await import('node:fs');

  if (!exists(source)) {
    const error = new Error(`Pending script not found: ${safeFile}`);
    error.statusCode = 404;
    throw error;
  }

  mkdirSync(resolve(process.cwd(), 'features', featureModule), { recursive: true });
  copyFileSync(source, target);
  return { approved: true, source: `generated-tests/pending/${safeFile}`, target: `features/${featureModule}/${safeFile}` };
}

async function startLiveRecorder(input = {}) {
  const url = normalizeRecorderUrl(input.url || input.websiteUrl);
  const browserName = validateChoice(input.browser || 'chromium', ['chromium', 'firefox', 'webkit', 'msedge'], 'browser');
  const recordingId = `REC-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const playwright = await import('playwright');
  const launcher = browserName === 'msedge' ? playwright.chromium : playwright[browserName];
  const browser = await launcher.launch({
    headless: false,
    channel: browserName === 'msedge' ? 'msedge' : undefined,
  });
  const context = await browser.newContext({
    recordVideo: { dir: resolve(process.cwd(), 'recordings', recordingId, 'videos') },
  });
  const recording = {
    id: recordingId,
    url,
    browserName,
    workspaceId: String(input.workspaceId || 'existing-workspace'),
    environment: String(input.environment || 'Local'),
    status: 'recording',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    stoppedAt: '',
    pausedAt: '',
    activePageUrl: url,
    activePageTitle: '',
    activePageIndex: 0,
    browser,
    context,
    pages: [],
    actions: [],
    draft: null,
    validation: null,
    metadata: {
      featureName: String(input.featureName || ''),
      scenarioName: String(input.scenarioName || ''),
      testName: String(input.testName || ''),
      module: String(input.module || ''),
      suite: String(input.suite || ''),
      tags: Array.isArray(input.tags) ? input.tags : [],
      priority: String(input.priority || 'Medium'),
    },
  };

  activeRecordings.set(recordingId, recording);
  ensureRecorderFolders(recordingId);
  await context.addInitScript(recorderCaptureScript());
  await context.exposeBinding('__qaRecorderCapture', async (source, payload) => {
    await captureRecorderAction(recording, source.page(), payload);
  });
  context.on('page', async (page) => {
    await attachRecorderPage(recording, page);
  });

  const page = await context.newPage();
  await attachRecorderPage(recording, page);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch (error) {
    recording.navigationError = error.message || 'Navigation failed';
    await captureRecorderAction(recording, page, {
      actionType: 'navigation',
      inputValue: null,
      element: {
        tagName: 'document',
        text: `Navigation failed for ${url}`,
        role: 'document',
        accessibleName: `Navigation failed for ${url}`,
      },
      primaryLocator: { type: 'url', value: url, confidence: 1 },
      fallbackLocators: [],
    });
  }
  recording.activePageTitle = await page.title().catch(() => '');
  persistRecording(recording);
  emitRecorderEvent(recordingId, { type: 'recording_started', recording: publicRecording(recording) });
  return recording;
}

async function attachRecorderPage(recording, page) {
  if (recording.pages.includes(page)) return;
  recording.pages.push(page);
  const pageIndex = recording.pages.length - 1;
  page.on('framenavigated', async (frame) => {
    if (frame !== page.mainFrame() || recording.status === 'stopped') return;
    recording.activePageUrl = page.url();
    recording.activePageTitle = await page.title().catch(() => '');
    recording.activePageIndex = pageIndex;
    await captureRecorderAction(recording, page, {
      actionType: 'navigation',
      inputValue: null,
      element: {
        tagName: 'document',
        text: recording.activePageTitle || page.url(),
        role: 'document',
        accessibleName: recording.activePageTitle || page.url(),
      },
      primaryLocator: { type: 'url', value: page.url(), confidence: 1 },
      fallbackLocators: [],
    });
  });
  page.on('popup', async (popup) => {
    await attachRecorderPage(recording, popup);
  });
  page.on('close', () => {
    recording.pages = recording.pages.filter((candidate) => candidate !== page);
  });
}

async function captureRecorderAction(recording, page, payload = {}) {
  if (!recording || recording.status !== 'recording') return;
  const action = normalizeCapturedAction(recording, page, payload);
  if (!action || isDuplicateRecorderAction(recording.actions.at(-1), action)) return;

  recording.actions.push(action);
  recording.activePageUrl = action.page.url;
  recording.activePageTitle = action.page.title;
  recording.activePageIndex = recording.pages.indexOf(page);
  try {
    const screenshotPath = resolve(process.cwd(), 'recordings', recording.id, 'screenshots', `${action.stepId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false, timeout: 3000 });
    action.screenshotPath = relative(process.cwd(), screenshotPath).replaceAll('\\', '/');
  } catch {
    action.screenshotPath = '';
  }
  refreshRecordingDraft(recording);
  persistRecording(recording);
  emitRecorderEvent(recording.id, { type: 'action_recorded', action, recording: publicRecording(recording) });
}

async function stopLiveRecorder(recordingId) {
  const recording = getActiveRecording(recordingId);
  recording.status = 'stopped';
  recording.stoppedAt = new Date().toISOString();
  refreshRecordingDraft(recording);
  persistRecording(recording);
  await recording.context?.close().catch(() => {});
  await recording.browser?.close().catch(() => {});
  emitRecorderEvent(recording.id, { type: 'recording_stopped', recording: publicRecording(recording) });
  return recording;
}

function getActiveRecording(recordingId) {
  const recording = activeRecordings.get(recordingId) || readPersistedRecording(recordingId);
  if (!recording) {
    const error = new Error(`Recording not found: ${recordingId}`);
    error.statusCode = 404;
    throw error;
  }
  return recording;
}

function publicRecording(recording) {
  return {
    recordingId: recording.id,
    url: recording.url,
    browser: recording.browserName,
    workspaceId: recording.workspaceId,
    environment: recording.environment,
    status: recording.status,
    createdAt: recording.createdAt,
    startedAt: recording.startedAt,
    stoppedAt: recording.stoppedAt,
    currentUrl: recording.activePageUrl,
    pageTitle: recording.activePageTitle,
    navigationError: recording.navigationError || '',
    activePageIndex: recording.activePageIndex,
    actionCount: recording.actions.length,
    durationMs: Date.now() - new Date(recording.startedAt).getTime(),
    draft: recording.draft,
    validation: recording.validation,
  };
}

function normalizeCapturedAction(recording, page, payload) {
  const sequence = recording.actions.length + 1;
  const element = payload.element || {};
  const actionType = normalizeRecordedActionType(payload.actionType, element);
  if (!actionType) return null;
  const sensitive = Boolean(payload.sensitive || isSensitiveElement(element));
  const inputValue = sensitive ? '' : String(payload.inputValue ?? '');
  const primaryLocator = payload.primaryLocator || buildLocatorFromElement(element);
  const fallbackLocators = Array.isArray(payload.fallbackLocators) ? payload.fallbackLocators.filter(Boolean).slice(0, 4) : buildFallbackLocators(element);
  const pageUrl = page?.url?.() || recording.activePageUrl || recording.url;
  return {
    recordingId: recording.id,
    stepId: `STEP-${String(sequence).padStart(3, '0')}`,
    sequence,
    timestamp: new Date().toISOString(),
    actionType,
    page: {
      url: pageUrl,
      title: payload.page?.title || recording.activePageTitle || '',
    },
    element: {
      tagName: String(element.tagName || '').toLowerCase(),
      text: cleanElementText(element.text),
      role: element.role || '',
      accessibleName: element.accessibleName || element.ariaLabel || element.label || cleanElementText(element.text),
      label: element.label || '',
      placeholder: element.placeholder || '',
      testId: element.testId || '',
      name: element.name || '',
      stableId: isStableDomId(element.stableId || element.id) ? (element.stableId || element.id) : '',
      type: element.type || '',
      cssPath: element.cssPath || '',
    },
    primaryLocator,
    fallbackLocators,
    inputValue,
    sensitive,
    screenshotPath: '',
    generatedStep: businessStepForAction(actionType, element, inputValue),
    pageObjectMethod: methodNameForAction(actionType, element),
  };
}

function normalizeRecordedActionType(actionType, element = {}) {
  const action = String(actionType || '').toLowerCase();
  if (action === 'input' || action === 'typing') return 'fill';
  if (action === 'change' && String(element.tagName).toLowerCase() === 'select') return 'select';
  if (action === 'change' && ['checkbox', 'radio'].includes(String(element.type).toLowerCase())) return element.checked ? 'check' : 'uncheck';
  if (['navigation', 'click', 'dblclick', 'fill', 'select', 'check', 'uncheck', 'keypress', 'hover', 'scroll', 'submit', 'download', 'drag', 'drop'].includes(action)) return action;
  return '';
}

function isDuplicateRecorderAction(previous, next) {
  if (!previous || !next) return false;
  if (previous.actionType !== next.actionType) return false;
  if (previous.page.url !== next.page.url) return false;
  if (previous.element.accessibleName !== next.element.accessibleName) return false;
  if (previous.inputValue !== next.inputValue) return false;
  return new Date(next.timestamp).getTime() - new Date(previous.timestamp).getTime() < 350;
}

function refreshRecordingDraft(recording) {
  if (!recording.actions.length) {
    recording.draft = null;
    return;
  }
  recording.draft = generateRecorderAutomationDraft({
    recordingId: recording.id,
    websiteUrl: recording.url,
    events: recording.actions.map(recordedActionToGeneratorEvent),
    metadata: recording.metadata,
  });
  recording.validation = validateRecorderDraft(recording);
}

function recordedActionToGeneratorEvent(action) {
  return {
    id: action.stepId,
    order: action.sequence,
    action: action.actionType === 'navigation' ? 'goto' : action.actionType,
    target: action.element.accessibleName || action.element.text || action.page.title || action.page.url,
    value: action.sensitive ? maskedSensitiveValue(action) : action.inputValue,
    page: inferPageNameFromUrl(action.page.url, action.page.title),
    component: inferRecorderComponent(action.element.accessibleName || action.element.text || action.element.tagName),
    intent: action.generatedStep.replace(/^(the user|the customer)\s+/i, ''),
    selectors: {
      testId: action.element.testId,
      role: action.element.role,
      name: action.element.accessibleName,
      label: action.element.label,
      placeholder: action.element.placeholder,
      id: action.element.stableId,
      css: action.element.cssPath,
      text: action.element.text,
      primary: action.primaryLocator?.value,
      fallbacks: action.fallbackLocators,
    },
    sensitive: action.sensitive,
  };
}

function persistRecording(recording) {
  const serializable = {
    ...publicRecording(recording),
    id: recording.id,
    browserName: recording.browserName,
    actions: recording.actions,
    metadata: recording.metadata,
  };
  const file = resolve(process.cwd(), 'recordings', recording.id, 'recording.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(serializable, null, 2), 'utf8');
}

function readPersistedRecording(recordingId) {
  const safeId = sanitizeRecordingId(recordingId);
  const file = resolve(process.cwd(), 'recordings', safeId, 'recording.json');
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return {
    id: data.id || safeId,
    url: data.url,
    browserName: data.browser || data.browserName || 'chromium',
    workspaceId: data.workspaceId || 'existing-workspace',
    environment: data.environment || 'Local',
    status: data.status || 'stopped',
    createdAt: data.createdAt,
    startedAt: data.startedAt,
    stoppedAt: data.stoppedAt || '',
    pausedAt: data.pausedAt || '',
    activePageUrl: data.currentUrl || data.url,
    activePageTitle: data.pageTitle || '',
    activePageIndex: data.activePageIndex || 0,
    browser: null,
    context: null,
    pages: [],
    actions: data.actions || [],
    draft: data.draft || null,
    validation: data.validation || null,
    metadata: data.metadata || {},
  };
}

function normalizeRecordedActionList(actions) {
  return actions.map((action, index) => ({
    ...action,
    sequence: index + 1,
    stepId: action.stepId || `STEP-${String(index + 1).padStart(3, '0')}`,
  }));
}

function readRecorderGeneratedFiles(recording) {
  if (!recording.draft) refreshRecordingDraft(recording);
  const files = (recording.draft?.generatedFiles || []).map((file) => {
    const target = resolve(process.cwd(), file);
    return {
      path: file,
      exists: existsSync(target),
      content: existsSync(target) && statSync(target).isFile() ? readFileSync(target, 'utf8') : '',
    };
  });
  return { recordingId: recording.id, files };
}

function finalizeRecorderDraft(recordingId, metadata = {}) {
  const recording = getActiveRecording(recordingId);
  recording.metadata = {
    ...recording.metadata,
    featureName: String(metadata.featureName || recording.metadata.featureName || ''),
    scenarioName: String(metadata.scenarioName || recording.metadata.scenarioName || ''),
    testName: String(metadata.testName || recording.metadata.testName || ''),
    module: String(metadata.module || recording.metadata.module || ''),
    suite: String(metadata.suite || recording.metadata.suite || ''),
    priority: String(metadata.priority || recording.metadata.priority || 'Medium'),
    tags: Array.isArray(metadata.tags) ? metadata.tags : recording.metadata.tags || [],
  };
  recording.status = recording.status === 'recording' ? 'recording' : 'finalized';
  refreshRecordingDraft(recording);
  persistRecording(recording);
  emitRecorderEvent(recording.id, { type: 'recording_finalized', recording: publicRecording(recording) });
  return recording;
}

function validateRecorderDraft(recording) {
  const errors = [];
  const warnings = [];
  if (!recording.actions.length) errors.push('No browser actions have been recorded.');
  if (!recording.actions.some((action) => ['click', 'fill', 'select', 'check', 'uncheck', 'submit'].includes(action.actionType))) {
    warnings.push('No interactive user actions were captured yet.');
  }
  if (!recording.actions.some((action) => action.actionType === 'navigation')) warnings.push('No navigation event was captured.');
  const weak = recording.actions.filter((action) => (action.primaryLocator?.confidence || 0) < 0.75);
  if (weak.length) warnings.push(`${weak.length} action(s) use weak selectors. Prefer data-testid, role, label, or placeholder attributes.`);
  const sensitive = recording.actions.filter((action) => action.sensitive);
  if (sensitive.length) warnings.push(`${sensitive.length} sensitive input value(s) were masked and moved to generated test data placeholders.`);
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

function streamRecorderEvents(request, response, recordingId) {
  const safeId = sanitizeRecordingId(recordingId);
  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'text/event-stream; charset=utf-8',
  });
  response.write(`event: connected\ndata: ${JSON.stringify({ recordingId: safeId })}\n\n`);
  const clients = recorderEventClients.get(safeId) || new Set();
  clients.add(response);
  recorderEventClients.set(safeId, clients);
  request.on('close', () => {
    clients.delete(response);
    if (!clients.size) recorderEventClients.delete(safeId);
  });
}

function emitRecorderEvent(recordingId, event) {
  const clients = recorderEventClients.get(recordingId);
  if (!clients?.size) return;
  const payload = `event: ${event.type || 'message'}\ndata: ${JSON.stringify({ ...event, timestamp: new Date().toISOString() })}\n\n`;
  for (const client of clients) client.write(payload);
}

function ensureRecorderFolders(recordingId) {
  for (const folder of ['screenshots', 'videos']) {
    mkdirSync(resolve(process.cwd(), 'recordings', recordingId, folder), { recursive: true });
  }
}

function sanitizeRecordingId(recordingId) {
  return String(recordingId || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function recorderCaptureScript() {
  return `
(() => {
  if (window.__qaRecorderInstalled) return;
  window.__qaRecorderInstalled = true;
  let lastScroll = { x: window.scrollX, y: window.scrollY, at: Date.now() };
  const send = (payload) => {
    if (!window.__qaRecorderCapture) return;
    window.__qaRecorderCapture({
      ...payload,
      page: { url: location.href, title: document.title },
    }).catch(() => {});
  };
  const textOf = (element) => (element?.innerText || element?.textContent || element?.value || '').trim().replace(/\\s+/g, ' ').slice(0, 160);
  const labelsFor = (element) => {
    if (!element) return '';
    if (element.labels?.length) return Array.from(element.labels).map((label) => textOf(label)).filter(Boolean).join(' ');
    const id = element.getAttribute('id');
    if (id) {
      const label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      if (label) return textOf(label);
    }
    return '';
  };
  const cssPath = (element) => {
    if (!element || !element.tagName) return '';
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-test') || element.getAttribute('data-qa');
    if (testId) return '[data-testid="' + testId.replace(/"/g, '\\\\"') + '"]';
    const id = element.getAttribute('id');
    if (id && !/[0-9a-f]{8,}|:[a-z0-9]+|\\d{5,}/i.test(id)) return '#' + CSS.escape(id);
    const parts = [];
    let current = element;
    while (current && current.nodeType === 1 && parts.length < 4) {
      let part = current.tagName.toLowerCase();
      const name = current.getAttribute('name');
      if (name) part += '[name="' + name.replace(/"/g, '\\\\"') + '"]';
      else {
        const siblings = Array.from(current.parentElement?.children || []).filter((item) => item.tagName === current.tagName);
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
      }
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ');
  };
  const roleOf = (element) => {
    const explicit = element?.getAttribute?.('role');
    if (explicit) return explicit;
    const tag = element?.tagName?.toLowerCase();
    const type = element?.getAttribute?.('type')?.toLowerCase();
    if (tag === 'button' || type === 'button' || type === 'submit') return 'button';
    if (tag === 'a' && element.getAttribute('href')) return 'link';
    if (tag === 'input' && ['checkbox', 'radio'].includes(type)) return type;
    if (tag === 'input' && ['search'].includes(type)) return 'searchbox';
    if (tag === 'input' || tag === 'textarea') return 'textbox';
    if (tag === 'select') return 'combobox';
    if (tag === 'form') return 'form';
    return '';
  };
  const elementPayload = (element) => {
    const target = element?.closest?.('button,a,input,textarea,select,[role],[data-testid],[data-test],[data-qa],label') || element;
    const label = labelsFor(target);
    const ariaLabel = target?.getAttribute?.('aria-label') || '';
    const text = textOf(target);
    const placeholder = target?.getAttribute?.('placeholder') || '';
    const name = target?.getAttribute?.('name') || '';
    const testId = target?.getAttribute?.('data-testid') || target?.getAttribute?.('data-test') || target?.getAttribute?.('data-qa') || '';
    const accessibleName = ariaLabel || label || placeholder || text || name;
    return {
      tagName: target?.tagName?.toLowerCase?.() || '',
      text,
      role: roleOf(target),
      accessibleName,
      label,
      ariaLabel,
      placeholder,
      testId,
      name,
      stableId: target?.getAttribute?.('id') || '',
      type: target?.getAttribute?.('type') || '',
      checked: Boolean(target?.checked),
      cssPath: cssPath(target),
    };
  };
  const locatorFor = (element) => {
    if (element.testId) return { type: 'testId', value: "getByTestId('" + element.testId.replace(/'/g, "\\\\'") + "')", confidence: 0.99 };
    if (element.role && element.accessibleName) return { type: 'role', value: "getByRole('" + element.role + "', { name: '" + element.accessibleName.replace(/'/g, "\\\\'") + "' })", confidence: 0.95 };
    if (element.label) return { type: 'label', value: "getByLabel('" + element.label.replace(/'/g, "\\\\'") + "')", confidence: 0.92 };
    if (element.ariaLabel) return { type: 'aria-label', value: "locator('[aria-label=\\"" + element.ariaLabel.replace(/"/g, '\\\\"') + "\\"]')", confidence: 0.86 };
    if (element.placeholder) return { type: 'placeholder', value: "getByPlaceholder('" + element.placeholder.replace(/'/g, "\\\\'") + "')", confidence: 0.84 };
    if (element.name) return { type: 'name', value: "locator('[name=\\"" + element.name.replace(/"/g, '\\\\"') + "\\"]')", confidence: 0.78 };
    if (element.stableId && !/[0-9a-f]{8,}|:[a-z0-9]+|\\d{5,}/i.test(element.stableId)) return { type: 'id', value: "locator('#" + CSS.escape(element.stableId) + "')", confidence: 0.74 };
    return { type: 'css', value: "locator('" + element.cssPath.replace(/'/g, "\\\\'") + "')", confidence: 0.62 };
  };
  const fallbacksFor = (element) => {
    const values = [];
    if (element.testId) values.push("getByTestId('" + element.testId.replace(/'/g, "\\\\'") + "')");
    if (element.role && element.accessibleName) values.push("getByRole('" + element.role + "', { name: '" + element.accessibleName.replace(/'/g, "\\\\'") + "' })");
    if (element.label) values.push("getByLabel('" + element.label.replace(/'/g, "\\\\'") + "')");
    if (element.placeholder) values.push("getByPlaceholder('" + element.placeholder.replace(/'/g, "\\\\'") + "')");
    if (element.name) values.push("locator('[name=\\"" + element.name.replace(/"/g, '\\\\"') + "\\"]')");
    if (element.cssPath) values.push("locator('" + element.cssPath.replace(/'/g, "\\\\'") + "')");
    return Array.from(new Set(values)).slice(0, 4);
  };
  const sensitive = (element) => /password|token|secret|card|cc-|cvv|cvc|security|ssn|phone|email/i.test([element.type, element.name, element.label, element.placeholder, element.accessibleName].join(' '));
  const emitElementAction = (actionType, target, inputValue = null) => {
    const element = elementPayload(target);
    send({
      actionType,
      element,
      primaryLocator: locatorFor(element),
      fallbackLocators: fallbacksFor(element),
      inputValue,
      sensitive: sensitive(element),
    });
  };
  document.addEventListener('click', (event) => emitElementAction('click', event.target), true);
  document.addEventListener('dblclick', (event) => emitElementAction('dblclick', event.target), true);
  document.addEventListener('change', (event) => emitElementAction('change', event.target, event.target?.value || null), true);
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!target || !['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
    clearTimeout(target.__qaRecorderInputTimer);
    target.__qaRecorderInputTimer = setTimeout(() => emitElementAction('input', target, target.value || ''), 250);
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') return;
    if (event.key === 'Enter' || event.ctrlKey || event.metaKey) emitElementAction('keypress', event.target, event.key);
  }, true);
  document.addEventListener('submit', (event) => emitElementAction('submit', event.target), true);
  window.addEventListener('scroll', () => {
    const delta = Math.abs(window.scrollY - lastScroll.y) + Math.abs(window.scrollX - lastScroll.x);
    if (delta < 220 || Date.now() - lastScroll.at < 700) return;
    lastScroll = { x: window.scrollX, y: window.scrollY, at: Date.now() };
    send({
      actionType: 'scroll',
      element: { tagName: 'window', text: 'Window scroll', role: 'document', accessibleName: 'Window scroll', cssPath: 'body' },
      primaryLocator: { type: 'page', value: 'page', confidence: 1 },
      fallbackLocators: [],
      inputValue: String(window.scrollY),
      sensitive: false,
    });
  }, true);
})();
`;
}

function buildLocatorFromElement(element) {
  const locators = buildElementLocatorCandidates(element);
  return locators[0] || { type: 'css', value: "locator('body')", confidence: 0.5 };
}

function buildFallbackLocators(element) {
  return buildElementLocatorCandidates(element).slice(1).map((locator) => locator.value);
}

function buildElementLocatorCandidates(element = {}) {
  const candidates = [];
  if (element.testId) candidates.push({ type: 'testId', value: `getByTestId('${escapeTs(element.testId)}')`, confidence: 0.99 });
  if (element.role && element.accessibleName) candidates.push({ type: 'role', value: `getByRole('${escapeTs(element.role)}', { name: '${escapeTs(element.accessibleName)}' })`, confidence: 0.95 });
  if (element.label) candidates.push({ type: 'label', value: `getByLabel('${escapeTs(element.label)}')`, confidence: 0.92 });
  if (element.ariaLabel) candidates.push({ type: 'aria-label', value: `locator('[aria-label="${escapeCssAttribute(element.ariaLabel)}"]')`, confidence: 0.86 });
  if (element.placeholder) candidates.push({ type: 'placeholder', value: `getByPlaceholder('${escapeTs(element.placeholder)}')`, confidence: 0.84 });
  if (element.name) candidates.push({ type: 'name', value: `locator('[name="${escapeCssAttribute(element.name)}"]')`, confidence: 0.78 });
  if (isStableDomId(element.stableId || element.id)) candidates.push({ type: 'id', value: `locator('#${escapeCssIdentifier(element.stableId || element.id)}')`, confidence: 0.74 });
  if (element.cssPath) candidates.push({ type: 'css', value: `locator('${escapeTs(element.cssPath)}')`, confidence: 0.62 });
  if (element.text) candidates.push({ type: 'text', value: `getByText('${escapeTs(cleanElementText(element.text))}')`, confidence: 0.58 });
  return candidates;
}

function playwrightLocatorSnippet(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.startsWith('this.page.')) return text;
  if (/^(getBy|locator\()/.test(text)) return `this.page.${text}`;
  return '';
}

function businessStepForAction(actionType, element = {}, inputValue = '') {
  const name = cleanElementText(element.accessibleName || element.label || element.placeholder || element.text || element.tagName || 'element');
  if (actionType === 'navigation') return 'the customer opens the website';
  if (actionType === 'fill') return `the customer enters ${fieldBusinessName(name)}`;
  if (actionType === 'select') return `the customer selects ${inputValue || name}`;
  if (actionType === 'check') return `the customer enables ${name}`;
  if (actionType === 'uncheck') return `the customer disables ${name}`;
  if (actionType === 'submit') return 'the customer submits the form';
  if (actionType === 'scroll') return 'the customer scrolls the page';
  if (actionType === 'keypress') return `the customer presses ${inputValue}`;
  return `the customer opens ${name}`;
}

function methodNameForAction(actionType, element = {}) {
  return camelCase(businessStepForAction(actionType, element).replace(/^the customer\s+/, ''));
}

function fieldBusinessName(value) {
  const text = String(value || 'value').toLowerCase();
  if (text.includes('email')) return 'the email address';
  if (text.includes('password')) return 'the password';
  if (text.includes('search')) return 'a search term';
  return value;
}

function maskedSensitiveValue(action) {
  const key = String(action.element.accessibleName || action.element.name || action.element.placeholder || 'RECORDED_SECRET').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  return `process.env.TEST_${key}`;
}

function isSensitiveElement(element = {}) {
  return /password|token|secret|card|cvv|cvc|security|ssn|phone|email/i.test([
    element.type,
    element.name,
    element.label,
    element.placeholder,
    element.accessibleName,
  ].filter(Boolean).join(' '));
}

function isStableDomId(value) {
  return Boolean(value) && !/[0-9a-f]{8,}|:[a-z0-9]+|\d{5,}/i.test(String(value));
}

function cleanElementText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
}

function inferPageNameFromUrl(url, title = '') {
  if (title) return titleCase(title.split(/[|-]/)[0].trim()).replace(/[^A-Za-z0-9 ]/g, '') || 'Recorded Page';
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split('/').filter(Boolean).at(-1) || 'home';
    return titleCase(segment);
  } catch {
    return 'Recorded Page';
  }
}

function generateRecorderAutomationDraft(input = {}) {
  const websiteUrl = normalizeRecorderUrl(input.websiteUrl);
  const rawEvents = Array.isArray(input.events) ? input.events : [];
  if (!rawEvents.length) {
    const error = new Error('Recorder generation requires real recorded browser actions.');
    error.statusCode = 400;
    throw error;
  }
  const events = normalizeRecorderEvents(rawEvents);
  const metadata = input.metadata || {};
  const recordingId = sanitizeRecordingId(input.recordingId) || `REC-${Date.now()}`;
  const moduleName = normalizeModuleName(metadata.module || inferRecorderModule(events));
  const featureName = titleCase(metadata.featureName || moduleName);
  const pageClassName = `${featureName.replace(/[^A-Za-z0-9]/g, '') || 'Generated'}Page`;
  const scenarioName = metadata.scenarioName || inferRecorderScenario(events);
  const selectorPlan = events.map((event, index) => buildRecorderSelector(event, index));
  const featureCode = createRecorderFeature({ featureName, scenarioName, moduleName, events });
  const pageCode = createRecorderPageObject({ pageClassName, events, selectorPlan });
  const stepsCode = createRecorderSteps({ pageClassName, moduleName, events });
  const testDataCode = createRecorderTestData(events, websiteUrl);
  const review = buildRecorderReview({ websiteUrl, featureName, scenarioName, moduleName, events, selectorPlan });
  const bundleRoot = resolve(process.cwd(), 'generated-tests/pending/recordings', recordingId);
  const files = [
    [`features/${moduleName}/${recordingId}.feature`, featureCode],
    [`pages/generated/${pageClassName}.ts`, pageCode],
    [`steps/generated/${moduleName}.recorded.steps.ts`, stepsCode],
    [`utils/generated/${moduleName}.recorded-data.ts`, testDataCode],
    ['review.json', JSON.stringify(review, null, 2)],
  ];

  for (const [file, content] of files) {
    const target = resolve(bundleRoot, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
  }

  return {
    recordingId,
    websiteUrl,
    feature: featureName,
    scenario: scenarioName,
    module: moduleName,
    flow: events.map((event) => event.intent),
    timeline: events,
    generatedFiles: files.map(([file]) => `generated-tests/pending/recordings/${recordingId}/${file}`),
    review,
  };
}

function approveRecorderAutomationDraft(recordingId) {
  const safeRecordingId = String(recordingId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeRecordingId) {
    const error = new Error('recordingId is required for approval');
    error.statusCode = 400;
    throw error;
  }

  const bundleRoot = resolve(process.cwd(), 'generated-tests/pending/recordings', safeRecordingId);
  if (!existsSync(bundleRoot)) {
    const error = new Error(`Recorder draft not found: ${safeRecordingId}`);
    error.statusCode = 404;
    throw error;
  }

  const approvedFiles = [];
  for (const source of collectFilesSync(bundleRoot, (name) => !name.endsWith('.json'))) {
    const pathFromBundle = relative(bundleRoot, source);
    const target = resolve(process.cwd(), pathFromBundle);
    const pathFromWorkspace = relative(process.cwd(), target);
    if (pathFromWorkspace.startsWith('..') || isAbsolute(pathFromWorkspace)) {
      const error = new Error('Recorder approval target escaped the project workspace');
      error.statusCode = 400;
      throw error;
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    approvedFiles.push(pathFromWorkspace.replaceAll('\\', '/'));
  }

  return { approved: true, recordingId: safeRecordingId, files: approvedFiles };
}

function normalizeRecorderUrl(value) {
  try {
    const rawValue = String(value || '').trim();
    const url = new URL(/^https?:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url.toString();
  } catch {
    const error = new Error('Enter a valid http or https website URL');
    error.statusCode = 400;
    throw error;
  }
}

function normalizeRecorderEvents(events) {
  return events.map((event, index) => {
    const action = String(event.action || 'click').toLowerCase();
    const target = String(event.target || event.label || `element ${index + 1}`).trim();
    const intent = String(event.intent || inferRecorderIntent(action, target)).trim();
    return {
      id: event.id || `step-${String(index + 1).padStart(2, '0')}`,
      order: index + 1,
      action,
      target,
      value: String(event.value || ''),
      page: String(event.page || inferRecorderPage(target)).trim(),
      component: String(event.component || inferRecorderComponent(target)).trim(),
      intent,
      selectors: event.selectors || {},
    };
  });
}

function defaultRecorderEvents(websiteUrl) {
  const host = new URL(websiteUrl).hostname.replace(/^www\./, '');
  return [
    { action: 'goto', target: host, intent: 'Open homepage', page: 'Home', selectors: { role: 'document' } },
    { action: 'click', target: 'Login', intent: 'Navigate to login page', page: 'Home', component: 'Header', selectors: { role: 'button', name: 'Login', text: 'Login' } },
    { action: 'fill', target: 'Email', value: 'qa.user@example.com', intent: 'Enter valid email', page: 'Login', component: 'Auth form', selectors: { label: 'Email', placeholder: 'Email' } },
    { action: 'fill', target: 'Password', value: '********', intent: 'Enter valid password', page: 'Login', component: 'Auth form', selectors: { label: 'Password', placeholder: 'Password' } },
    { action: 'click', target: 'Sign In', intent: 'Submit login form', page: 'Login', component: 'Auth form', selectors: { role: 'button', name: 'Sign In', text: 'Sign In' } },
    { action: 'assert', target: 'Account area', intent: 'Verify user is logged in', page: 'Account', component: 'Account shell', selectors: { role: 'main', text: 'Account' } },
  ];
}

function buildRecorderSelector(event, index) {
  const selectors = event.selectors || {};
  const explicitFallbacks = Array.isArray(selectors.fallbacks) ? selectors.fallbacks.map(playwrightLocatorSnippet).filter(Boolean) : [];
  const primary = selectors.testId ? `this.page.getByTestId('${escapeTs(selectors.testId)}')`
    : selectors.role ? `this.page.getByRole('${escapeTs(selectors.role)}'${selectors.name ? `, { name: /${escapeRegexLiteral(selectors.name)}/i }` : ''})`
    : selectors.label ? `this.page.getByLabel(/${escapeRegexLiteral(selectors.label)}/i)`
    : selectors.placeholder ? `this.page.getByPlaceholder(/${escapeRegexLiteral(selectors.placeholder)}/i)`
    : selectors.name ? `this.page.locator('[name="${escapeCssAttribute(selectors.name)}"]')`
    : selectors.id ? `this.page.locator('#${escapeCssIdentifier(selectors.id)}')`
    : selectors.css ? `this.page.locator('${escapeTs(selectors.css)}')`
    : `this.page.getByText(/${escapeRegexLiteral(event.target)}/i)`;
  const backup = selectors.text ? `this.page.getByText(/${escapeRegexLiteral(selectors.text)}/i)`
    : selectors.role && !selectors.name ? `this.page.getByRole('${escapeTs(selectors.role)}')`
    : `this.page.locator('text=${escapeTs(event.target)}')`;
  const backups = [...new Set([
    ...explicitFallbacks,
    backup,
    selectors.css ? `this.page.locator('${escapeTs(selectors.css)}')` : '',
    selectors.name ? `this.page.locator('[name="${escapeCssAttribute(selectors.name)}"]')` : '',
    `this.page.getByText(/${escapeRegexLiteral(event.target)}/i)`,
  ].filter(Boolean).filter((candidate) => candidate !== primary))].slice(0, 3);

  return {
    stepId: event.id,
    propertyName: `${camelCase(event.action)}${index + 1}`,
    primary,
    backup,
    backups,
    strategy: selectors.testId ? 'data-testid' : selectors.role ? 'role' : selectors.label ? 'label' : selectors.placeholder ? 'placeholder' : selectors.name ? 'name' : selectors.id ? 'id' : selectors.css ? 'stable css' : 'text fallback',
  };
}

function createRecorderFeature({ featureName, scenarioName, moduleName, events }) {
  const steps = events.map((event, index) => {
    const keyword = index === 0 ? 'Given' : index === events.length - 1 && event.action === 'assert' ? 'Then' : 'When';
    return `    ${keyword} I ${event.intent.toLowerCase()}`;
  }).join('\n');
  return `@generated @review-required @module:${moduleName} @coverage:partial @risk:medium\nFeature: ${featureName}\n\n  Scenario: ${scenarioName}\n${steps}\n`;
}

function createRecorderPageObject({ pageClassName, events, selectorPlan }) {
  const locatorMethods = selectorPlan.map((selector) => `  private ${selector.propertyName}() {\n    return this.selfHealingLocator(\n      '${selector.stepId}',\n      () => ${selector.primary},\n      [${selector.backups.map((backup) => `() => ${backup}`).join(', ')}],\n    );\n  }`).join('\n\n');
  const actionMethods = events.map((event, index) => {
    const selector = selectorPlan[index];
    const method = camelCase(event.intent);
    if (event.action === 'goto') return `  async ${method}(url: string) {\n    await this.page.goto(url);\n  }`;
    if (event.action === 'fill') return `  async ${method}(value: string) {\n    await this.${selector.propertyName}().fill(value);\n  }`;
    if (event.action === 'select') return `  async ${method}(value: string) {\n    await this.${selector.propertyName}().selectOption(value);\n  }`;
    if (event.action === 'check') return `  async ${method}() {\n    await this.${selector.propertyName}().check();\n  }`;
    if (event.action === 'uncheck') return `  async ${method}() {\n    await this.${selector.propertyName}().uncheck();\n  }`;
    if (event.action === 'keypress') return `  async ${method}(key: string) {\n    await this.page.keyboard.press(key);\n  }`;
    if (event.action === 'scroll') return `  async ${method}() {\n    await this.page.mouse.wheel(0, 600);\n  }`;
    if (event.action === 'assert') return `  async ${method}() {\n    await expect(this.${selector.propertyName}()).toBeVisible();\n  }`;
    if (event.action === 'hover') return `  async ${method}() {\n    await this.${selector.propertyName}().hover();\n  }`;
    return `  async ${method}() {\n    await this.${selector.propertyName}().click();\n  }`;
  }).join('\n\n');
  return `import { expect, type Locator, type Page } from '@playwright/test';\n\nexport class ${pageClassName} {\n  constructor(private readonly page: Page) {}\n\n${locatorMethods}\n\n${actionMethods}\n\n  private selfHealingLocator(stepId: string, primary: () => Locator, backups: Array<() => Locator>) {\n    return backups.reduce((locator, backup) => locator.or(backup()), primary()).first().describe(\`AI recorder locator for \${stepId}\`);\n  }\n}\n`;
}

function createRecorderSteps({ pageClassName, moduleName, events }) {
  const imports = `import { createBdd } from 'playwright-bdd';\nimport { test } from '../../fixtures/bddFixture';\nimport { ${pageClassName} } from '../../pages/generated/${pageClassName}';\nimport { recorded${titleCase(moduleName).replace(/[^A-Za-z0-9]/g, '')}Data } from '../../utils/generated/${moduleName}.recorded-data';\n\nconst { Given, When, Then } = createBdd(test);\n`;
  const steps = events.map((event, index) => {
    const keyword = index === 0 ? 'Given' : index === events.length - 1 && event.action === 'assert' ? 'Then' : 'When';
    const phrase = `I ${event.intent.toLowerCase()}`;
    const method = camelCase(event.intent);
    const value = event.action === 'goto' ? 'recordedData.websiteUrl' : ['fill', 'select', 'keypress'].includes(event.action) ? `recordedData.values['${escapeTs(event.id)}'] || ''` : '';
    const arg = value ? value : '';
    return `${keyword}('${phrase}', async ({ page }) => {\n  const recordedPage = new ${pageClassName}(page);\n  const recordedData = recorded${titleCase(moduleName).replace(/[^A-Za-z0-9]/g, '')}Data;\n  await recordedPage.${method}(${arg});\n});`;
  }).join('\n\n');
  return `${imports}\n${steps}\n`;
}

function createRecorderTestData(events, websiteUrl) {
  const valueLines = events
    .filter((event) => ['fill', 'select', 'keypress'].includes(event.action))
    .map((event) => {
      const expression = String(event.value || '').startsWith('process.env.')
        ? `${event.value} || ''`
        : `'${escapeTs(event.value)}'`;
      return `    '${escapeTs(event.id)}': ${expression}`;
    });
  return `export const recorded${titleCase(inferRecorderModule(events)).replace(/[^A-Za-z0-9]/g, '')}Data = {\n  websiteUrl: '${escapeTs(websiteUrl)}',\n  values: {\n${valueLines.join(',\n')}\n  },\n};\n`;
}

function buildRecorderReview({ websiteUrl, featureName, scenarioName, moduleName, events, selectorPlan }) {
  const weakSelectors = selectorPlan.filter((selector) => ['stable css', 'text fallback'].includes(selector.strategy));
  const confidence = Math.max(55, 96 - weakSelectors.length * 9 - events.filter((event) => event.action === 'wait').length * 5);
  return {
    detectedFeature: featureName,
    detectedScenario: scenarioName,
    detectedFlow: events.map((event) => `${event.page}: ${event.intent}`),
    module: moduleName,
    websiteUrl,
    generatedPageObjects: [`pages/generated/${featureName.replace(/[^A-Za-z0-9]/g, '')}Page.ts`],
    generatedAssertions: events.filter((event) => event.action === 'assert').map((event) => event.intent),
    generatedSelectors: selectorPlan.map(({ stepId, strategy, primary, backup }) => ({ stepId, strategy, primary, backup })),
    confidenceScore: confidence,
    potentialProblems: [
      ...(weakSelectors.length ? ['Some actions rely on text or CSS fallback selectors; add data-testid or accessible roles for higher stability.'] : []),
      'Recorded data is masked/draft and should be reviewed before running against shared environments.',
      'Generated assets are pending until human approval copies them into the active framework.',
    ],
  };
}

function inferRecorderModule(events) {
  const text = events.map((event) => `${event.page} ${event.component} ${event.intent} ${event.target}`).join(' ').toLowerCase();
  if (/login|sign in|password|auth|account/.test(text)) return 'auth';
  if (/search|product|catalog/.test(text)) return 'search';
  if (/cart|basket|bag/.test(text)) return 'cart';
  if (/checkout|payment|shipping|billing/.test(text)) return 'checkout';
  return 'homepage';
}

function normalizeModuleName(value) {
  const normalized = String(value || 'homepage').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const allowed = new Set(['homepage', 'smoke', 'auth', 'search', 'cart', 'checkout', 'ui', 'regression']);
  return allowed.has(normalized) ? normalized : 'generated';
}

function inferRecorderScenario(events) {
  const moduleName = inferRecorderModule(events);
  if (moduleName === 'auth') return 'Successful recorded login flow';
  if (moduleName === 'checkout') return 'Recorded checkout journey';
  if (moduleName === 'cart') return 'Recorded add to cart journey';
  if (moduleName === 'search') return 'Recorded product search journey';
  return 'Recorded user journey';
}

function inferRecorderIntent(action, target) {
  if (action === 'goto') return 'Open homepage';
  if (action === 'fill') return `Enter ${target}`;
  if (action === 'assert') return `Verify ${target}`;
  return `${titleCase(action)} ${target}`;
}

function inferRecorderPage(target) {
  if (/login|sign in|password|email/i.test(target)) return 'Login';
  if (/cart|basket/i.test(target)) return 'Cart';
  if (/checkout|payment/i.test(target)) return 'Checkout';
  return 'Page';
}

function inferRecorderComponent(target) {
  if (/login|sign in|password|email/i.test(target)) return 'Auth form';
  if (/search/i.test(target)) return 'Search';
  if (/cart|basket/i.test(target)) return 'Cart';
  return 'Content';
}

function titleCase(value) {
  return String(value || 'Generated')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function camelCase(value) {
  const words = String(value || 'action').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/);
  return words.map((word, index) => {
    const normalized = word.charAt(0).toUpperCase() + word.slice(1);
    return index === 0 ? normalized.charAt(0).toLowerCase() + normalized.slice(1) : normalized;
  }).join('') || 'action';
}

function escapeTs(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeRegexLiteral(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
}

function escapeCssAttribute(value) {
  return String(value || '').replace(/"/g, '\\"');
}

function escapeCssIdentifier(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function buildPassedQaComment(ticket, analysis) {
  const manualCases = analysis?.manual_test_cases || [];
  const missingCoverage = analysis?.missing_coverage || [];
  const tags = analysis?.suggested_playwright_script?.tags || [];
  const environment = analysis?.test_environment || ticket.environment || 'QA environment';
  const modules = uniqueText([...(analysis?.impacted_modules || []), ...(ticket.components || [])]).join(', ') || 'General UI';

  return [
    '**QA Sign-off Summary**',
    '',
    `Validated ${ticket.key} on ${environment}.`,
    '',
    '**Scope Tested**',
    '',
    ...uniqueText([...(analysis?.impacted_modules || []), ...(ticket.components || [])]).map((item) => `- ${item}`),
    `- ${manualCases.length} manual test case(s) reviewed`,
    '',
    '**Result**',
    '',
    'Passed',
    '',
    '**Issues Found**',
    '',
    missingCoverage.length ? `- ${missingCoverage.length} automation coverage gap(s) recorded for follow-up` : '- None',
    '',
    '**Notes**',
    '',
    `Ready for the next stage. Scope: ${modules}.`,
    tags.length ? `Recommended automation tags: ${tags.join(', ')}.` : '',
  ].filter((line) => line !== undefined).join('\n').trim();
}

function applySelectedEnvironment(ticket, requestedEnvironment) {
  if (!requestedEnvironment) return ticket;
  const environment = environmentCatalog.find((item) => item.id === String(requestedEnvironment).toUpperCase());
  if (!environment) {
    const error = new Error(`Unsupported environment: ${requestedEnvironment}`);
    error.statusCode = 400;
    throw error;
  }
  ticket.environment = environment.id;
  ticket.environmentUrl = environment.url;
  return ticket;
}

async function addJiraComment(ticketKey, comment) {
  if (!ticketKey || ticketKey === 'LOCAL-SAMPLE') {
    const error = new Error('A real Jira ticket key is required to add a Jira comment');
    error.statusCode = 400;
    throw error;
  }

  const trimmed = String(comment || '').trim();
  if (!trimmed) {
    const error = new Error('Comment is required');
    error.statusCode = 400;
    throw error;
  }

  const result = await jiraFetchPost(`/rest/api/3/issue/${encodeURIComponent(ticketKey)}/comment`, {
    body: toAtlassianDocument(trimmed),
  });

  return {
    posted: true,
    id: result.id || '',
    ticketKey,
    url: `${jiraBaseUrl}/browse/${ticketKey}`,
  };
}

function toAtlassianDocument(value) {
  const content = [];
  let bulletItems = [];
  const flushBullets = () => {
    if (!bulletItems.length) return;
    content.push({
      type: 'bulletList',
      content: bulletItems.map((text) => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      })),
    });
    bulletItems = [];
  };

  for (const rawLine of String(value || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^\*\*(.+)\*\*$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      bulletItems.push(bullet[1]);
      continue;
    }
    flushBullets();
    if (heading) {
      content.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: heading[1] }] });
    } else {
      content.push({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] });
    }
  }
  flushBullets();

  return {
    type: 'doc',
    version: 1,
    content: content.length ? content : [{ type: 'paragraph', content: [] }],
  };
}

function uniqueText(items) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

function createAssistantFeature(ticket, analysis) {
  const tags = analysis.suggested_playwright_script.tags.join(' ');
  const criteria = ticket.acceptanceCriteria.length ? ticket.acceptanceCriteria : ['Acceptance criteria must be supplied'];
  const scenarios = criteria.map((criterion, index) => `
  @ac:AC-${String(index + 1).padStart(3, '0')} @coverage:missing @manual @skip
  Scenario: ${toGherkinText(criterion)}
    Given the ${analysis.suggested_playwright_script.module} preconditions for ${ticket.key} are satisfied
    When the customer performs the acceptance criterion
    Then ${toGherkinText(criterion)}
`).join('');

  return `@jira:${ticket.key} @module:${analysis.suggested_playwright_script.module} @priority:${ticket.priority.toLowerCase()} @risk:${analysis.risk_level.toLowerCase()} ${tags}
Feature: ${toGherkinText(ticket.title)}
  Pending feature generated for review. Implement missing step and POM methods before removing @skip.
${scenarios}
`;
}

function toGherkinText(value) {
  return String(value || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
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

function validatePlaywrightRunOptions(body = {}) {
  const workers = Number(body.workers || 2);

  return {
    headed: Boolean(body.headed),
    workers: Number.isFinite(workers) ? Math.min(Math.max(workers, 1), 4) : 2,
  };
}

function runPlaywright(grep, options = { headed: false, workers: 2 }) {
  if (activePlaywrightRun) {
    const error = new Error('A Playwright run is already in progress');
    error.statusCode = 409;
    throw error;
  }

  return new Promise((resolveRun) => {
    const command = process.execPath;
    const playwrightCli = resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
    const args = [playwrightCli, 'test', '--grep', grep, '--workers', String(options.workers)];
    if (options.headed) {
      args.push('--headed');
    }
    const startedAt = new Date().toISOString();
    const env = sanitizeProcessEnv(process.env);
    let child;

    try {
      child = spawn(command, args, {
        cwd: process.cwd(),
        env,
        shell: false,
        windowsHide: true,
      });
    } catch (error) {
      resolveRun({
        grep,
        exitCode: 1,
        passed: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: '',
        stderr: `Failed to start Playwright: ${error.message}`,
        report: readPlaywrightReportSummary(`Failed to start Playwright: ${error.message}`),
        mode: options.headed ? 'headed' : 'headless',
        workers: options.workers,
      });
      return;
    }

    activePlaywrightRun = child;
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      activePlaywrightRun = null;
      resolveRun({
        grep,
        exitCode: 1,
        passed: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: stdout.slice(-8000),
        stderr: `Failed to start Playwright: ${error.message}`,
        report: readPlaywrightReportSummary(`Failed to start Playwright: ${error.message}`),
        mode: options.headed ? 'headed' : 'headless',
        workers: options.workers,
      });
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
        report: readPlaywrightReportSummary(`${stderr}\n${stdout}`),
        mode: options.headed ? 'headed' : 'headless',
        workers: options.workers,
      });
    });
  });
}

function runPlaywrightSpecific(item, input = {}) {
  if (activePlaywrightRun) {
    const error = new Error('A Playwright run is already in progress');
    error.statusCode = 409;
    throw error;
  }

  const browser = validateChoice(input.browser || 'chromium', ['chromium', 'firefox', 'webkit'], 'browser');
  const environment = validateChoice(input.environment || 'CF_UK', environmentCatalog.map((entry) => entry.id), 'environment');
  const options = validatePlaywrightRunOptions(input);

  return new Promise((resolveRun) => {
    const playwrightCli = resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
    const args = [
      playwrightCli,
      'test',
      item.file,
      '--grep',
      escapeRegex(item.scenario),
      '--project',
      browser,
      '--workers',
      String(options.workers),
    ];
    if (options.headed) args.push('--headed');
    const startedAt = new Date().toISOString();
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: sanitizeProcessEnv({ ...process.env, QA_TARGET_ENV: environment, HEADLESS: options.headed ? 'false' : 'true' }),
      shell: false,
      windowsHide: true,
    });
    activePlaywrightRun = child;
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      activePlaywrightRun = null;
      resolveRun({ exitCode: 1, passed: false, error: error.message, browser, environment, startedAt, finishedAt: new Date().toISOString() });
    });
    child.on('close', (exitCode) => {
      activePlaywrightRun = null;
      resolveRun({
        exitCode,
        passed: exitCode === 0,
        browser,
        environment,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: stdout.slice(-8000),
        stderr: stderr.slice(-8000),
        latest: readJsonArtifact('reports/run-summary.json', null),
      });
    });
  });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runLastFailed(options = { headed: false, workers: 2 }) {
  if (activePlaywrightRun) {
    const error = new Error('A Playwright run is already in progress');
    error.statusCode = 409;
    throw error;
  }

  return new Promise((resolveRun) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = ['run', 'test:bdd:failed', '--', '--workers', String(options.workers)];
    if (options.headed) args.push('--headed');
    const startedAt = new Date().toISOString();
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: sanitizeProcessEnv(process.env),
      shell: false,
      windowsHide: true,
    });
    activePlaywrightRun = child;
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      activePlaywrightRun = null;
      resolveRun({ exitCode: 1, passed: false, startedAt, finishedAt: new Date().toISOString(), error: error.message });
    });
    child.on('close', (exitCode) => {
      activePlaywrightRun = null;
      resolveRun({
        exitCode,
        passed: exitCode === 0,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: stdout.slice(-8000),
        stderr: stderr.slice(-8000),
        report: readPlaywrightReportSummary(`${stderr}\n${stdout}`),
      });
    });
  });
}

function runBddPipeline(input = {}) {
  if (activePlaywrightRun) {
    const error = new Error('A Playwright run is already in progress');
    error.statusCode = 409;
    throw error;
  }

  const browser = validateChoice(input.browser || 'chromium', ['chromium', 'firefox', 'webkit', 'all'], 'browser');
  const suite = validateChoice(input.suite || 'smoke', ['smoke', 'auth', 'login', 'homepage', 'regression', 'bdd', 'all-stable', 'specific'], 'suite');
  const environment = validateChoice(input.environment || 'CF_UK', environmentCatalog.map((item) => item.id), 'environment');
  const jiraKey = String(input.jiraTicketKey || '').trim().toUpperCase();
  if (jiraKey && !/^[A-Z][A-Z0-9]+-\d+$/.test(jiraKey)) {
    const error = new Error(`Invalid Jira ticket key: ${jiraKey}`);
    error.statusCode = 400;
    throw error;
  }

  const options = validatePlaywrightRunOptions(input);
  const allowDestructive = input.allowDestructive === true;
  const suiteTags = {
    smoke: '@smoke',
    auth: '@auth',
    login: '@login',
    homepage: '@homepage',
    regression: '@regression',
    bdd: '@coverage:covered',
    'all-stable': '@coverage:covered',
  };
  const grep = suite === 'specific'
    ? escapeRegex(String(input.testName || '').trim())
    : jiraKey
    ? `(?=.*${suiteTags[suite]})(?=.*@jira:${jiraKey})`
    : suiteTags[suite];
  if (!grep) {
    const error = new Error('A test name is required for specific-test execution');
    error.statusCode = 400;
    throw error;
  }

  return new Promise((resolveRun) => {
    const startedAt = new Date().toISOString();
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const env = sanitizeProcessEnv({
      ...process.env,
      QA_TARGET_ENV: environment,
      HEADLESS: options.headed ? 'false' : 'true',
      ALLOW_DESTRUCTIVE_TESTS: allowDestructive ? 'true' : 'false',
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (exitCode, phase, errorMessage = '') => {
      if (settled) return;
      settled = true;
      activePlaywrightRun = null;
      resolveRun({
        browser,
        suite,
        environment,
        jiraTicketKey: jiraKey,
        allowDestructive,
        phase,
        exitCode,
        passed: exitCode === 0,
        startedAt,
        finishedAt: new Date().toISOString(),
        stdout: stdout.slice(-8000),
        stderr: `${stderr}\n${errorMessage}`.trim().slice(-8000),
        latest: readJsonArtifact('reports/run-summary.json', null),
      });
    };

    const generation = spawn(npmCommand, ['run', 'bddgen'], {
      cwd: process.cwd(),
      env,
      shell: false,
      windowsHide: true,
    });
    activePlaywrightRun = generation;
    generation.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    generation.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    generation.on('error', (error) => finish(1, 'generation', error.message));
    generation.on('close', (generationExitCode) => {
      if (settled) return;
      if (generationExitCode !== 0) {
        finish(generationExitCode || 1, 'generation');
        return;
      }

      const playwrightCli = resolve(process.cwd(), 'node_modules', '@playwright', 'test', 'cli.js');
      const args = [
        playwrightCli,
        'test',
        '--config=playwright.bdd.config.ts',
        '--grep',
        grep,
        '--workers',
        String(options.workers),
      ];
      const projects = browser === 'all' ? ['chromium', 'firefox', 'webkit'] : [browser];
      projects.forEach((project) => args.push('--project', project));
      if (options.headed) args.push('--headed');

      const execution = spawn(process.execPath, args, {
        cwd: process.cwd(),
        env,
        shell: false,
        windowsHide: true,
      });
      activePlaywrightRun = execution;
      execution.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      execution.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      execution.on('error', (error) => finish(1, 'execution', error.message));
      execution.on('close', (exitCode) => finish(exitCode || 0, 'execution'));
    });
  });
}

function validateChoice(value, allowed, name) {
  const normalized = String(value);
  if (!allowed.includes(normalized)) {
    const error = new Error(`Unsupported ${name}: ${normalized}`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function sanitizeProcessEnv(env) {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function readPlaywrightReportSummary(output = '') {
  const reportPath = resolve(process.cwd(), 'reports/playwright/results.json');

  if (!existsSync(reportPath)) {
    return {
      exists: false,
      reportPath: 'reports/playwright/results.json',
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: output ? [createSyntheticFailure(output)] : [],
      suggestions: suggestPlaywrightFixes(output),
    };
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const specs = collectSpecs(report.suites || []);
  const failures = collectPlaywrightFailures(specs, output);
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
    { exists: true, reportPath: 'reports/playwright/results.json', total: 0, passed: 0, failed: 0, skipped: 0, failures, suggestions: suggestPlaywrightFixes(output, failures) },
  );

  return summary;
}

function readJsonArtifact(relativePath, fallback) {
  const artifactPath = resolve(process.cwd(), relativePath);
  if (!existsSync(artifactPath)) return fallback;

  try {
    return JSON.parse(readFileSync(artifactPath, 'utf8'));
  } catch {
    return fallback;
  }
}

function reportCatalog() {
  const artifacts = [
    ['playwrightHtml', 'reports/playwright/html/index.html', '/api/test-runs/artifacts/playwright/index.html'],
    ['playwrightJson', 'reports/playwright/results.json', '/api/test-runs/artifacts/json/results.json'],
    ['allureReport', 'reports/allure-report/index.html', '/api/test-runs/artifacts/allure/index.html'],
    ['markdown', 'reports/markdown', '/api/test-runs/artifacts/markdown/'],
    ['excel', 'reports/excel/test-case-matrix.xlsx', '/api/test-runs/artifacts/excel/test-case-matrix.xlsx'],
    ['ndjson', 'reports/ndjson/live-output.ndjson'],
    ['failures', 'reports/failures/failure-triage.json'],
    ['screenshots', 'reports/playwright/artifacts', '/api/test-runs/artifacts/evidence/'],
    ['traces', 'reports/playwright/artifacts', '/api/test-runs/artifacts/evidence/'],
    ['videos', 'reports/playwright/artifacts', '/api/test-runs/artifacts/evidence/'],
  ];

  return Object.fromEntries(artifacts.map(([name, path, url]) => [
    name,
    { path, url: url || '', exists: existsSync(resolve(process.cwd(), path)) },
  ]));
}

function readTestInventory() {
  const latest = readJsonArtifact('reports/run-summary.json', { results: [] });
  const items = [
    ...readFeatureInventory(resolve(process.cwd(), 'features'), 'bdd'),
    ...readLegacySpecInventory(resolve(process.cwd(), 'tests/e2e')),
    ...readFeatureInventory(resolve(process.cwd(), 'generated-tests/pending'), 'pending'),
  ].map((item) => ({
    ...item,
    lastRunStatus: latest.results?.find((result) => result.title === item.scenario || result.title?.includes(item.scenario))?.status || 'not-run',
  }));
  const statuses = items.reduce((totals, item) => {
    totals[item.status] = (totals[item.status] || 0) + 1;
    return totals;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      all: items.length,
      active: statuses.active || 0,
      manual: statuses.manual || 0,
      unstable: statuses.unstable || 0,
      destructive: statuses.destructive || 0,
      pending: statuses.pending || 0,
    },
    items,
  };
}

function readFeatureInventory(root, source) {
  return collectFilesSync(root, (name) => name.endsWith('.feature')).flatMap((file) => {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    const featureTags = [];
    let scenarioTags = [];
    let feature = '';
    const items = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('@')) {
        const tags = line.match(/@[A-Za-z0-9:_-]+/g) || [];
        if (!feature) featureTags.push(...tags);
        else scenarioTags.push(...tags);
        continue;
      }
      if (line.startsWith('Feature:')) {
        feature = line.replace(/^Feature:\s*/, '').trim();
        continue;
      }
      if (!line.startsWith('Scenario:') && !line.startsWith('Scenario Outline:')) continue;

      const title = line.replace(/^Scenario(?: Outline)?:\s*/, '').trim();
      const tags = [...new Set([...featureTags, ...scenarioTags])];
      const relativeFile = relative(process.cwd(), file).replaceAll('\\', '/');
      const status = source === 'pending' ? 'pending' : inventoryStatus(tags);
      items.push({
        id: `${relativeFile}:${title}`,
        source,
        framework: 'BDD',
        feature: feature || basenameWithoutExtension(file),
        scenario: title,
        file: relativeFile,
        module: tagValue(tags, 'module') || inferInventoryModule(relativeFile),
        jira: tagValue(tags, 'jira') || '',
        acceptanceCriteria: tags.filter((tag) => tag.startsWith('@ac:')).map((tag) => tag.slice(4)),
        coverage: tagValue(tags, 'coverage') || 'missing',
        priority: tagValue(tags, 'priority') || 'unassigned',
        risk: tagValue(tags, 'risk') || 'unassessed',
        status,
        tags,
      });
      scenarioTags = [];
    }

    return items;
  });
}

function readLegacySpecInventory(root) {
  return collectFilesSync(root, (name) => name.endsWith('.spec.ts')).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const relativeFile = relative(process.cwd(), file).replaceAll('\\', '/');
    return [...source.matchAll(/\btest\(['"`]([^'"`]+)/g)].map((match) => {
      const scenario = match[1];
      const tags = [...new Set(scenario.match(/@[A-Za-z0-9:_-]+/g) || [])];
      return {
        id: `${relativeFile}:${scenario}`,
        source: 'legacy',
        framework: 'Playwright',
        feature: basenameWithoutExtension(file),
        scenario,
        file: relativeFile,
        module: inferInventoryModule(`${relativeFile} ${tags.join(' ')}`),
        jira: scenario.match(/\b[A-Z][A-Z0-9]+-\d+\b/)?.[0] || '',
        acceptanceCriteria: [],
        coverage: 'missing',
        priority: 'unassigned',
        risk: 'unassessed',
        status: inventoryStatus(tags),
        tags,
      };
    });
  });
}

function collectFilesSync(root, predicate) {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const path = resolve(root, name);
    if (statSync(path).isDirectory()) return collectFilesSync(path, predicate);
    return predicate(name) ? [path] : [];
  });
}

function inventoryStatus(tags) {
  if (tags.includes('@destructive')) return 'destructive';
  if (tags.includes('@unstable')) return 'unstable';
  if (tags.includes('@manual') || tags.includes('@skip')) return 'manual';
  return 'active';
}

function tagValue(tags, name) {
  return tags.find((tag) => tag.startsWith(`@${name}:`))?.slice(name.length + 2) || '';
}

function inferInventoryModule(value) {
  const text = String(value).toLowerCase();
  for (const module of ['homepage', 'auth', 'footer', 'search', 'cart', 'checkout']) {
    if (text.includes(module) || text.includes(`@${module}`)) return module;
  }
  return 'general';
}

function basenameWithoutExtension(file) {
  return file.split(/[\\/]/).at(-1)?.replace(/\.(feature|spec\.ts)$/, '') || 'unknown';
}

function sendReportArtifact(response, requestPath, routeName, reportDirectory) {
  const prefix = `/api/test-runs/artifacts/${routeName}`;
  const suffix = decodeURIComponent(requestPath.slice(prefix.length)).replace(/^\/+/, '');
  const root = resolve(process.cwd(), reportDirectory);
  const target = resolve(root, suffix || (existsSync(resolve(root, 'index.html')) ? 'index.html' : '.'));
  const pathFromRoot = relative(root, target);

  if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot) || !existsSync(target)) {
    sendJson(response, 404, { error: 'Report artifact not found' });
    return;
  }

  if (statSync(target).isDirectory()) {
    const entries = readdirSync(target, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .map((entry) => {
        const href = `${requestUrlPath(requestPath)}/${encodeURIComponent(entry.name)}${entry.isDirectory() ? '/' : ''}`.replace(/\/+/g, '/');
        return `<li><a href="${escapeHtml(href)}">${escapeHtml(entry.name)}${entry.isDirectory() ? '/' : ''}</a></li>`;
      })
      .join('');
    response.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><meta charset="utf-8"><title>QA report artifacts</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:0 20px;background:#0a111d;color:#eef}a{color:#67e8f9}li{margin:10px 0}</style><h1>QA report artifacts</h1><ul>${entries || '<li>No artifacts available.</li>'}</ul>`);
    return;
  }

  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
    'Content-Type': contentTypeFor(target),
  });
  response.end(readFileSync(target));
}

function requestUrlPath(value) {
  return String(value).replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function contentTypeFor(file) {
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return types[extname(file).toLowerCase()] || 'application/octet-stream';
}

function collectSpecs(suites) {
  return suites.flatMap((suite) => [...(suite.specs || []), ...collectSpecs(suite.suites || [])]);
}

function collectPlaywrightFailures(specs, output) {
  const failures = [];

  for (const spec of specs) {
    for (const test of spec.tests || []) {
      const result = test.results?.find((item) => item.status && !['passed', 'skipped'].includes(item.status)) || test.results?.at(-1);
      const status = test.status || test.outcome || result?.status || 'unknown';

      if (['expected', 'passed', 'skipped'].includes(status) && (!result || ['passed', 'skipped'].includes(result.status))) {
        continue;
      }

      const error = result?.error || result?.errors?.[0] || {};
      const message = normalizeFailureMessage(error.message || error.snippet || output || 'Playwright test failed.');
      failures.push({
        title: test.title || spec.title || spec.file || 'Unknown Playwright test',
        file: spec.file || '',
        status,
        duration: result?.duration || 0,
        reason: classifyPlaywrightFailure(message),
        message,
        suggestion: suggestPlaywrightFixes(message).slice(0, 3),
      });
    }
  }

  return failures.slice(0, 10);
}

function createSyntheticFailure(output) {
  const message = normalizeFailureMessage(output);

  return {
    title: 'Playwright startup or execution failed',
    file: '',
    status: 'failed',
    duration: 0,
    reason: classifyPlaywrightFailure(message),
    message,
    suggestion: suggestPlaywrightFixes(message).slice(0, 3),
  };
}

function normalizeFailureMessage(value) {
  return String(value || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join('\n')
    .slice(0, 1600);
}

function classifyPlaywrightFailure(message) {
  const value = message.toLowerCase();
  if (/cloudflare|verify you are human|checking if the site connection is secure/.test(value)) return 'Cloudflare challenge blocked the run';
  if (/timeout|timed out|waiting for/.test(value)) return 'Element or navigation timeout';
  if (/strict mode violation/.test(value)) return 'Locator matched multiple elements';
  if (/login_email|login_password|credentials|required/.test(value)) return 'Missing or invalid test credentials';
  if (/net::|err_name_not_resolved|err_connection|navigation/.test(value)) return 'Environment or network navigation failure';
  if (/expect\(.*\)|tohave|tocontain|assert/.test(value)) return 'Assertion did not match the current UI';
  if (/spawn|failed to start|enoent|einval/.test(value)) return 'Playwright process could not start';
  return 'Test failed during execution';
}

function suggestPlaywrightFixes(message = '', failures = []) {
  const text = `${message} ${failures.map((failure) => failure.message).join(' ')}`.toLowerCase();
  const suggestions = new Set();

  if (/cloudflare|verify you are human/.test(text)) {
    suggestions.add('Do not bypass Cloudflare. Re-run when the staging site is accessible or whitelist the test environment.');
  }
  if (/timeout|waiting for/.test(text)) {
    suggestions.add('Check whether the locator is visible in the current viewport and move unstable selectors into the page object.');
    suggestions.add('Add a web-first assertion for the expected page state before the next action.');
  }
  if (/strict mode violation|resolved to/.test(text)) {
    suggestions.add('Refine the page-object locator with role/name/test-id or a safer visible container.');
  }
  if (/login_email|login_password|credentials|required/.test(text)) {
    suggestions.add('Set LOGIN_EMAIL and LOGIN_PASSWORD in .env, then restart the API server.');
  }
  if (/net::|err_name_not_resolved|err_connection|navigation/.test(text)) {
    suggestions.add('Verify DEFAULT_TEST_ENV, DEFAULT_LOCALE, and the target base URL in .env.');
  }
  if (/spawn|failed to start|enoent|einval/.test(text)) {
    suggestions.add('Run npm install and verify node_modules/@playwright/test exists.');
    suggestions.add('Run npx playwright install chromium if browsers are missing.');
  }
  if (!suggestions.size) {
    suggestions.add('Open the HTML report and inspect the trace, screenshot, and failing page-object action.');
    suggestions.add('Re-run headed mode from the app to watch the browser and confirm the failing UI state.');
  }

  return [...suggestions].slice(0, 5);
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(payload));
}
