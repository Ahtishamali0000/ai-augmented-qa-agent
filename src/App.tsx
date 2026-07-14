import {
  Activity,
  AlertTriangle,
  Bot,
  Braces,
  CheckCircle2,
  Code2,
  Database,
  FileJson,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  MousePointerClick,
  Network,
  PlugZap,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Split,
  TestTube2,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { QAAnalysisPanel } from './components/jira/QAAnalysisPanel';
import { TicketDetailView } from './components/jira/TicketDetailView';
import { QaFormattedContent } from './components/QaFormattedContent';

type JiraTicket = {
  key: string;
  url: string;
  summary: string;
  status: string;
  type: string;
  priority: string;
  assignee: string;
  updated: string;
};

type JiraTicketResponse = {
  siteUrl: string;
  projectUrl: string;
  boardUrl: string;
  projectKey: string;
  boardId: string;
  status: string;
  assignees: string[];
  fetchedTotal?: number;
  qaTotal?: number;
  jql?: string;
  total: number;
  tickets: JiraTicket[];
};

type PipelineTestResult = {
  title: string;
  feature: string;
  featureFile: string;
  browser: string;
  status: string;
  duration: number;
  tags: string[];
  error?: string;
  screenshot?: string;
  trace?: string;
  video?: string;
};

type PipelineRunSummary = {
  generatedAt: string | null;
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: PipelineTestResult[];
};

type FailureTriageCard = {
  testTitle: string;
  featureFile: string;
  scenario: string;
  browser: string;
  errorMessage: string;
  screenshotPath: string;
  tracePath: string;
  videoPath: string;
  suggestedFailureType: string;
  suggestedNextAction: string;
  rerunCommand: string;
};

type ReportArtifact = {
  path: string;
  url?: string;
  exists: boolean;
};

type QaEnvironment = {
  id: string;
  name: string;
  url: string;
};

type LivePipelineEvent = {
  type: string;
  scenario?: string;
  feature?: string;
  browser?: string;
  duration?: number;
  status?: string;
  error?: string;
  timestamp: string;
};

type PipelineRunResponse = {
  browser: string;
  suite: string;
  jiraTicketKey: string;
  allowDestructive: boolean;
  phase: string;
  exitCode: number;
  passed: boolean;
  error?: string;
  stderr?: string;
  latest?: PipelineRunSummary;
};

type TestInventoryItem = {
  id: string;
  source: 'bdd' | 'legacy' | 'pending';
  framework: string;
  feature: string;
  scenario: string;
  file: string;
  module: string;
  jira: string;
  acceptanceCriteria: string[];
  coverage: string;
  priority: string;
  risk: string;
  status: 'active' | 'manual' | 'unstable' | 'destructive' | 'pending';
  tags: string[];
  lastRunStatus: string;
};

type TestInventory = {
  generatedAt: string;
  totals: {
    all: number;
    active: number;
    manual: number;
    unstable: number;
    destructive: number;
    pending: number;
  };
  items: TestInventoryItem[];
};

type AssistantTicket = {
  key: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  labels: string[];
  components: string[];
  issueType: string;
  environment: string;
  created: string;
  updated: string;
  comments: JiraTicketComment[];
  url?: string;
};

type JiraTicketComment = {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
};

type ManualTestCase = {
  id: string;
  title: string;
  priority: string;
  type: string;
  preconditions: string[];
  steps: string[];
  expected_result: string;
  test_data: string[];
  tags: string[];
};

type AssistantCoverageGap = {
  acceptance_criterion: string;
  coverage_status: string;
  matched_tests: string[];
  missing_scenarios: string[];
  recommended_tags: string[];
  automation_priority: string;
};

type ScriptSuggestion = {
  suggested_file_path: string;
  module: string;
  tags: string[];
  risk_level: string;
  generated_code: string;
  requires_human_review: boolean;
  assumptions: string[];
};

type RecorderEvent = {
  id: string;
  order: number;
  action: string;
  target: string;
  value: string;
  page: string;
  component: string;
  intent: string;
  selectors?: Record<string, string>;
};

type RecorderDraft = {
  recordingId: string;
  websiteUrl: string;
  feature: string;
  scenario: string;
  module: string;
  flow: string[];
  timeline: RecorderEvent[];
  generatedFiles: string[];
  review: {
    detectedFeature: string;
    detectedScenario: string;
    detectedFlow: string[];
    confidenceScore: number;
    potentialProblems: string[];
    generatedSelectors: Array<{
      stepId: string;
      strategy: string;
      primary: string;
      backup: string;
    }>;
  };
};

type RecorderStatus = {
  recordingId: string;
  url: string;
  browser: string;
  environment: string;
  status: string;
  currentUrl: string;
  pageTitle: string;
  navigationError?: string;
  actionCount: number;
  durationMs: number;
  draft: RecorderDraft | null;
  validation?: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  } | null;
};

type RecorderAction = {
  stepId: string;
  sequence: number;
  actionType: string;
  page: {
    url: string;
    title: string;
  };
  element: {
    accessibleName: string;
    text: string;
    tagName: string;
  };
  primaryLocator: {
    type: string;
    value: string;
    confidence: number;
  };
  generatedStep: string;
  pageObjectMethod: string;
  screenshotPath?: string;
};

type GeneratedRecorderFile = {
  path: string;
  exists: boolean;
  content: string;
};

async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

const recorderApiBase = import.meta.env.VITE_RECORDER_API_BASE || 'http://127.0.0.1:8787';

function recorderApi(path: string) {
  return `${recorderApiBase}${path}`;
}

type QaAssistantAnalysis = {
  ticket_key: string;
  title: string;
  issue_type: string;
  business_summary: string;
  qa_summary: string;
  risk_level: string;
  risk_score: number;
  impacted_modules: string[];
  assumptions: string[];
  dependencies: string[];
  comment_insights: string[];
  test_environment: string;
  how_to_test: Record<string, string[] | string>;
  manual_test_cases: ManualTestCase[];
  regression_impact: string[];
  automation_recommendation: string;
  existing_coverage: AssistantCoverageGap[];
  missing_coverage: AssistantCoverageGap[];
  suggested_playwright_script: ScriptSuggestion;
  approval_required: boolean;
};

const integrations = [
  { name: 'Jira Cloud', detail: 'REST v3, JQL, issue webhooks, comments, changelogs, linked issues, attachments, and custom QA fields.' },
  { name: 'GitHub', detail: 'GitHub Apps, issues, PRs, repository files, check runs, Actions, and webhook-driven review loops.' },
  { name: 'Azure Boards', detail: 'Work Item Tracking REST APIs, service hooks, Azure Pipelines, artifacts, and enterprise identity.' },
  { name: 'Linear', detail: 'GraphQL issue model, webhooks, projects, cycles, comments, labels, and lightweight product workflows.' },
  { name: 'Slack', detail: 'Signed events, incoming webhooks, chat messages, approvals, CI failures, and nightly QA digests.' },
  { name: 'Microsoft Teams', detail: 'Workflows, incoming webhooks, Adaptive Cards, Graph notifications, and proactive bot updates.' },
];

const workflow = [
  { stage: 'Ingest', output: 'Verified webhook, JQL result, or site-first exploration bundle' },
  { stage: 'Normalize', output: 'RequirementContract with actors, flows, AC, risks, dependencies, ambiguity questions' },
  { stage: 'Analyze', output: 'CoverageReport comparing requirements with manual tests and existing Playwright metadata' },
  { stage: 'Design', output: 'TestCatalog covering positive, negative, boundary, edge, API, data, accessibility, and regression cases' },
  { stage: 'Plan automation', output: 'AutomationPlan and keep, patch, rewrite, split, create-new, or manual-only decision' },
  { stage: 'Validate', output: 'ValidationReport from typecheck, lint, targeted Playwright, reports, traces, and deterministic gates' },
  { stage: 'Publish', output: 'PR, issue comments, trace links, coverage summaries, and Slack or Teams notifications' },
];

const artifacts = [
  { name: 'RequirementContract', detail: 'Canonical story model for actors, flows, business rules, AC, dependencies, risks, assumptions, and questions.' },
  { name: 'CoverageReport', detail: 'Maps each acceptance criterion to existing manual tests, automated specs, gaps, and stale coverage.' },
  { name: 'TestCatalog', detail: 'Structured positive, negative, boundary, edge, API-contract, data-variation, accessibility, and regression cases.' },
  { name: 'AutomationPlan', detail: 'Decides what belongs in Playwright E2E, API tests, mocks, fixtures, exploratory testing, or manual-only review.' },
  { name: 'CodeChangePlan', detail: 'Machine-readable patch or generation plan consumed by the deterministic code service.' },
  { name: 'ValidationReport', detail: 'Evidence package from compile, lint, tests, Playwright report, traces, risk score, and approval status.' },
];

const standards = [
  'TypeScript-first Playwright suites',
  'Page objects for page APIs',
  'Fixtures for reusable setup and auth',
  'getByRole, getByText, and getByTestId locators',
  'Web-first assertions instead of manual waits',
  'HTML, JSON, JUnit reports, screenshots, video, and traces',
];

const controls = [
  'Human approval for generated code and risky actions',
  'OIDC and secret-manager based credentials',
  'Prompt, schema, model, and artifact versioning',
  'OpenTelemetry correlation across AI, Jira, PR, CI, and test runs',
  'Deterministic validation before writeback or merge',
  'Rollback strategy for prompts, code generation, and CI changes',
];

const services = [
  { icon: <LayoutDashboard />, title: 'Integration Gateway', text: 'Receives webhooks, polls APIs, verifies signatures, rate-limits events, and maps provider payloads to canonical contracts.' },
  { icon: <Database />, title: 'Requirement Graph', text: 'Stores normalized tickets, acceptance criteria, comments, linked defects, attachments, existing tests, scripts, and trace metadata.' },
  { icon: <Sparkles />, title: 'AI Orchestrator', text: 'Runs narrow Responses API workflows with strict JSON schemas, function calling, retrieval, evals, and prompt/version control.', featured: true },
  { icon: <Workflow />, title: 'MCP Server', text: 'Exposes model-facing resources, prompts, and curated tools while OpenAPI remains the deterministic system contract.' },
  { icon: <Code2 />, title: 'Playwright Code Service', text: 'Applies generated plans, performs AST-aware updates where possible, validates code, creates branches, and opens PRs.' },
  { icon: <Activity />, title: 'Results Loop', text: 'Publishes reports, traces, defects, summaries, approvals, and release signals back to issue trackers and collaboration tools.' },
];

const scope = [
  { label: 'Ticket intelligence', value: 'Normalize stories, tasks, bugs, AC, screenshots, comments, links, and historical failures into a canonical requirement model.' },
  { label: 'Test asset generation', value: 'Create rephrased requirements, risk analysis, positive, negative, boundary, edge, regression, and checklist artifacts.' },
  { label: 'Automation intelligence', value: 'Decide whether existing Playwright scripts should be kept, patched, rewritten, split, or replaced with new specs.' },
  { label: 'PR-based delivery', value: 'Generate branches, validate patches, attach traces and reports, and route non-trivial code changes through review.' },
];

const modelRoutes = [
  { name: 'Strong reasoning model', detail: 'Requirement analysis, ambiguity detection, risk scoring, automation planning, code review, and high-stakes patch plans.' },
  { name: 'Fast mini model', detail: 'Bulk test-case generation, rephrasing, checklist expansion, duplicate triage, labeling, and nightly backlog sweeps.' },
  { name: 'Embeddings and retrieval', detail: 'Search prior requirements, manual tests, Playwright specs, traces, docs, and page-object inventories for context.' },
];

const decisions = [
  { label: 'Keep', rule: 'Requirement is unchanged and the existing test maps cleanly to acceptance criteria with resilient locators.' },
  { label: 'Patch', rule: 'Flow remains valid but selectors, data, assertions, or one sub-step changed.' },
  { label: 'Rewrite', rule: 'Multiple criteria changed, maintainability is poor, or the file mixes unrelated concerns.' },
  { label: 'Split', rule: 'One spec covers too many flows, roles, environments, or release risks.' },
  { label: 'Manual-only', rule: 'Scenario involves captcha, uncontrolled third parties, legal approvals, or destructive operations.' },
];

const pipelines = [
  { name: 'GitHub Actions', detail: 'PR, push, workflow_dispatch, cache, OIDC, artifacts, checks, targeted Playwright subsets.' },
  { name: 'Jenkins', detail: 'Repository-managed Jenkinsfile, Dockerized Playwright agent, staged install/analyze/test/publish flow.' },
  { name: 'Azure DevOps', detail: 'YAML triggers, templates, Node tasks, artifacts, service hooks, Boards/Pipelines feedback.' },
];

const githubWorkflowSteps = [
  'Build TypeScript and Vite app on push and pull request',
  'Install Playwright Chromium in CI',
  'Run smoke tests automatically or selected tag manually',
  'Read Jira ticket context during manual workflow runs',
  'Upload Playwright HTML and JSON reports as GitHub artifacts',
];

const githubIssueTemplates = [
  { name: 'User Story', detail: 'Structured summary, description, acceptance criteria, priority, component, and QA notes.' },
  { name: 'Bug Report', detail: 'Steps to reproduce, actual result, expected result, severity, environment, and evidence.' },
];

const githubSecrets = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN', 'LOGIN_EMAIL', 'LOGIN_PASSWORD'];

const mcpTools = [
  { name: 'list_project_qa_scope', detail: 'Shows EGO App and VSF2 Jira scope, allowed statuses, safe tags, and approval boundaries.' },
  { name: 'list_scoped_qa_tickets', detail: 'Reads the same scoped EGO App and VSF2 QA tickets used by the dashboard.' },
  { name: 'list_jira_tickets', detail: 'Reads assigned Jira tickets or local sample data when Jira credentials are missing.' },
  { name: 'read_jira_ticket', detail: 'Reads one Jira ticket with description, acceptance criteria, metadata, and comments.' },
  { name: 'analyze_jira_ticket', detail: 'Creates QA strategy, risk analysis, comment insights, manual cases, and automation recommendation.' },
  { name: 'create_qa_execution_package', detail: 'Creates ticket summary, QA analysis, manual cases, coverage gaps, next actions, and sign-off draft.' },
  { name: 'draft_passed_qa_comment', detail: 'Drafts a professional Jira QA pass comment without posting it.' },
  { name: 'post_approved_jira_comment', detail: 'Posts a Jira comment only when confirmed=true is supplied by a human-approved flow.' },
  { name: 'generate_manual_test_cases', detail: 'Generates structured manual QA cases from Jira acceptance criteria and comments.' },
  { name: 'check_playwright_coverage', detail: 'Maps ticket criteria to Playwright coverage gaps and recommended automation tags.' },
  { name: 'generate_pending_playwright_script', detail: 'Creates a draft Gherkin feature in generated-tests/pending only, with human review required.' },
  { name: 'list_playwright_tags', detail: 'Lists safe allow-listed tags such as @smoke, @login, @cart, @checkout, and @regression.' },
];

const mcpScenarios = [
  'Read a Jira ticket and summarize QA scope.',
  'Use Jira comments as extra testing context.',
  'Generate manual test cases from acceptance criteria.',
  'Detect missing Playwright coverage.',
  'Generate a pending BDD feature for review.',
  'Prepare Jira-ready QA summary after test execution.',
];

const mcpSafetyRules = [
  'MCP does not automatically approve generated scripts.',
  'MCP does not directly insert tests into tests/e2e.',
  'MCP write actions should remain behind human approval.',
  'Playwright execution should use allow-listed tags only.',
  'Secrets must stay in environment variables or GitHub secrets.',
];

const connectorRules = [
  { name: 'Jira', detail: 'Validate signatures, scope JQL ingestion, enrich on demand, and renew dynamic OAuth webhooks before expiration.' },
  { name: 'GitHub', detail: 'Prefer GitHub Apps over PATs, subscribe only to needed events, and monitor webhook payload size limits.' },
  { name: 'Slack', detail: 'Verify X-Slack-Signature, acknowledge quickly, enqueue async work, and keep OAuth scopes minimal.' },
  { name: 'Teams', detail: 'Use Workflows for outbound alerts, Graph subscriptions for events, and monitor renewal/fast-response requirements.' },
];

const kpis = [
  'Ticket-to-analysis turnaround time',
  'Accepted AI-generated test-case bundle rate',
  'Coverage gap detection rate',
  'Script patch acceptance rate',
  'PR-to-green time',
  'Flaky test rate',
  'Webhook validation success rate',
  'Artifact-assisted MTTR',
];

const roadmap = [
  { phase: 'MVP', time: 'Ticket in → test intelligence out', scope: 'OpenAPI service, MCP skeleton, canonical schemas, Jira/GitHub ingestion, structured analysis, TC bundle generation' },
  { phase: 'Beta', time: 'Ticket in → PR + targeted CI', scope: 'Existing-script analysis, Playwright patch/new-spec planning, PR creation, targeted Playwright execution, evidence links' },
  { phase: 'Production-ready', time: 'Governed multi-team platform', scope: 'Signed webhooks, retries, approvals, secrets, audit logs, evals, monitoring, Slack/Teams feedback loop' },
  { phase: 'Showcase+', time: 'Expanded intelligence layer', scope: 'Azure Boards, Linear, site reconnaissance, sharding, richer dashboards, connector health, and KPI reporting' },
];

const playwrightFrameworkFiles = [
  'pages/HomePage.ts',
  'pages/AuthPage.ts',
  'components/PopupHandler.ts',
  'utils/testData.ts',
  'fixtures/testFixture.ts',
  'tests/e2e/smoke/homepage.spec.ts',
  'tests/e2e/auth/login.spec.ts',
  'tests/e2e/auth/register.spec.ts',
];
const playwrightDebugArtifacts = [
  'reports/after-signup-click.png',
  'reports/registration-after-email.png',
  'reports/registration-before-submit.png',
  'reports/playwright/results.json',
];
const jiraScopedFilters = [
  'EGO App: TESTFLIGHT TESTING, Production Testing',
  'VSF2 board 20: DEV QA (TESTING ON DEV), CODE REVIEW (PR TO STAGE)',
];
const qaAssigneeFilters = ['All tickets', 'Sana.khan', 'Naveed Chughtai'];
function App() {
  const [jiraTickets, setJiraTickets] = useState<JiraTicket[]>([]);
  const [jiraSummary, setJiraSummary] = useState('');
  const [jiraError, setJiraError] = useState('');
  const [isLoadingJira, setIsLoadingJira] = useState(false);
  const [playwrightHeaded, setPlaywrightHeaded] = useState(false);
  const [playwrightWorkers, setPlaywrightWorkers] = useState(2);
  const [isRunningPlaywright, setIsRunningPlaywright] = useState(false);
  const [pipelineBrowser, setPipelineBrowser] = useState<'chromium' | 'firefox' | 'webkit' | 'all'>('chromium');
  const [pipelineSuite, setPipelineSuite] = useState<'smoke' | 'auth' | 'login' | 'homepage' | 'regression' | 'bdd' | 'all-stable'>('smoke');
  const [executionMode, setExecutionMode] = useState<'suite' | 'specific'>('suite');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [environments, setEnvironments] = useState<QaEnvironment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('CF_UK');
  const [pipelineJiraKey, setPipelineJiraKey] = useState('');
  const [allowDestructive, setAllowDestructive] = useState(false);
  const [pipelineSummary, setPipelineSummary] = useState<PipelineRunSummary | null>(null);
  const [pipelineFailures, setPipelineFailures] = useState<FailureTriageCard[]>([]);
  const [pipelineReports, setPipelineReports] = useState<Record<string, ReportArtifact>>({});
  const [pipelineEvents, setPipelineEvents] = useState<LivePipelineEvent[]>([]);
  const [testInventory, setTestInventory] = useState<TestInventory | null>(null);
  const [inventoryQuery, setInventoryQuery] = useState('');
  const [inventorySource, setInventorySource] = useState('all');
  const [inventoryStatus, setInventoryStatus] = useState('all');
  const [pipelineMessage, setPipelineMessage] = useState('');
  const [pipelineError, setPipelineError] = useState('');
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);
  const [assistantTickets, setAssistantTickets] = useState<AssistantTicket[]>([]);
  const [selectedAssistantTicket, setSelectedAssistantTicket] = useState<AssistantTicket | null>(null);
  const [assistantAnalysis, setAssistantAnalysis] = useState<QaAssistantAnalysis | null>(null);
  const [scriptSuggestion, setScriptSuggestion] = useState<ScriptSuggestion | null>(null);
  const [qaCommentPreview, setQaCommentPreview] = useState('');
  const [approvalMessage, setApprovalMessage] = useState('');
  const [assistantError, setAssistantError] = useState('');
  const [isAssistantBusy, setIsAssistantBusy] = useState(false);
  const [selectedQaAssignee, setSelectedQaAssignee] = useState('All tickets');
  const [recorderUrl, setRecorderUrl] = useState('https://example.com');
  const [recorderBrowser, setRecorderBrowser] = useState<'chromium' | 'firefox' | 'webkit' | 'msedge'>('chromium');
  const [recorderEnvironment, setRecorderEnvironment] = useState('Local');
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus | null>(null);
  const [recorderActions, setRecorderActions] = useState<RecorderAction[]>([]);
  const [recorderFiles, setRecorderFiles] = useState<GeneratedRecorderFile[]>([]);
  const [recorderDraft, setRecorderDraft] = useState<RecorderDraft | null>(null);
  const [recorderMessage, setRecorderMessage] = useState('');
  const [recorderError, setRecorderError] = useState('');
  const [isRecorderBusy, setIsRecorderBusy] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('qa-ai-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('qa-ai-theme', theme);
  }, [theme]);

  useEffect(() => {
    void loadEnvironments();
    void loadPipelineDashboard();
    const refreshId = window.setInterval(() => void loadPipelineDashboard(true), 15_000);
    return () => window.clearInterval(refreshId);
  }, []);

  useEffect(() => {
    if (!recorderStatus?.recordingId || !['recording', 'paused', 'stopped', 'finalized'].includes(recorderStatus.status)) return;
    const refreshId = window.setInterval(() => void loadRecorderSnapshot(recorderStatus.recordingId, true), recorderStatus.status === 'recording' ? 1200 : 3000);
    return () => window.clearInterval(refreshId);
  }, [recorderStatus?.recordingId, recorderStatus?.status]);

  async function loadEnvironments() {
    try {
      const response = await fetch('/api/environments');
      if (!response.ok) throw new Error('Environment service unavailable');
      const data = await response.json();
      setEnvironments(data.environments || []);
    } catch {
      setEnvironments([]);
    }
  }

  const filteredAssistantTickets = useMemo(() => {
    if (selectedQaAssignee === 'All tickets') {
      return assistantTickets;
    }

    const selected = selectedQaAssignee.toLowerCase();
    return assistantTickets.filter((ticket) => ticket.assignee.toLowerCase().includes(selected));
  }, [assistantTickets, selectedQaAssignee]);

  const filteredTestInventory = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();
    return (testInventory?.items || []).filter((item) => {
      const matchesQuery = !query || [
        item.scenario,
        item.feature,
        item.file,
        item.jira,
        item.module,
        ...item.acceptanceCriteria,
        ...item.tags,
      ].join(' ').toLowerCase().includes(query);
      const matchesSource = inventorySource === 'all' || item.source === inventorySource;
      const matchesStatus = inventoryStatus === 'all' || item.status === inventoryStatus;
      return matchesQuery && matchesSource && matchesStatus;
    });
  }, [inventoryQuery, inventorySource, inventoryStatus, testInventory]);

  const acceptanceInventory = useMemo(
    () => (testInventory?.items || []).filter((item) => item.framework === 'BDD'),
    [testInventory],
  );

  async function loadJiraTickets() {
    setIsLoadingJira(true);
    setJiraError('');
    setJiraSummary('');

    try {
      const response = await fetch('/api/jira/dev-qa-tickets');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Jira tickets');
      }

      const ticketResponse = data as JiraTicketResponse;
      setJiraTickets(ticketResponse.tickets);
      setJiraSummary(
        `${ticketResponse.total} scoped Jira ticket(s) fetched from ${ticketResponse.siteUrl}; ${ticketResponse.qaTotal ?? 0} match QA assignees ${ticketResponse.assignees.join(' or ')}.`,
      );
    } catch (error) {
      setJiraTickets([]);
      setJiraError(error instanceof Error ? error.message : 'Failed to load Jira tickets');
    } finally {
      setIsLoadingJira(false);
    }
  }

  async function loadPipelineDashboard(quiet = false) {
    if (!quiet) setIsLoadingPipeline(true);
    setPipelineError('');

    try {
      const [latestResponse, failuresResponse, reportsResponse, liveResponse, inventoryResponse] = await Promise.all([
        fetch('/api/test-runs/latest'),
        fetch('/api/test-runs/failures'),
        fetch('/api/test-runs/reports'),
        fetch('/api/test-runs/live'),
        fetch('/api/test-runs/inventory'),
      ]);

      if (![latestResponse, failuresResponse, reportsResponse, liveResponse, inventoryResponse].every((response) => response.ok)) {
        throw new Error('One or more QA pipeline endpoints are unavailable.');
      }

      const [latest, failures, reports, liveText, inventory] = await Promise.all([
        latestResponse.json(),
        failuresResponse.json(),
        reportsResponse.json(),
        liveResponse.text(),
        inventoryResponse.json(),
      ]);
      const events = liveText
        .split(/\r?\n/)
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as LivePipelineEvent];
          } catch {
            return [];
          }
        });

      setPipelineSummary(latest as PipelineRunSummary);
      setPipelineFailures(Array.isArray(failures) ? failures : []);
      setPipelineReports(reports as Record<string, ReportArtifact>);
      setPipelineEvents(events.slice(-12).reverse());
      setTestInventory(inventory as TestInventory);
    } catch (error) {
      if (!quiet) {
        setPipelineError(error instanceof Error ? error.message : 'Failed to load QA pipeline data');
      }
    } finally {
      if (!quiet) setIsLoadingPipeline(false);
    }
  }

  async function runBddPipeline() {
    if (executionMode === 'specific') {
      await runSpecificTest();
      return;
    }
    if (allowDestructive) {
      const confirmed = window.confirm(
        'Destructive execution may submit registration, orders, or payments. Confirm this is an isolated QA environment with approved test data.',
      );
      if (!confirmed) return;
    }

    setIsRunningPlaywright(true);
    setPipelineError('');
    setPipelineMessage(`Starting ${pipelineSuite} on ${pipelineBrowser}...`);

    try {
      const response = await fetch('/api/test-runs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: selectedEnvironment,
          browser: pipelineBrowser,
          suite: pipelineSuite,
          jiraTicketKey: pipelineJiraKey.trim(),
          headed: playwrightHeaded,
          workers: playwrightWorkers,
          allowDestructive,
        }),
      });
      const data = await response.json() as PipelineRunResponse;
      setPipelineMessage(
        data.passed
          ? `${data.suite} completed successfully on ${data.browser}.`
          : `${data.suite || pipelineSuite} finished with failures during ${data.phase || 'execution'}.`,
      );
      if (!response.ok) {
        setPipelineError(data.error || data.stderr || 'BDD pipeline execution failed');
      }
      await loadPipelineDashboard(true);
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : 'BDD pipeline execution failed');
    } finally {
      setIsRunningPlaywright(false);
    }
  }

  async function runSpecificTest(testId = selectedTestId) {
    const selected = testInventory?.items.find((item) => item.id === testId);
    if (!selected) {
      setPipelineError('Select a specific test before running automation.');
      return;
    }
    if (selected.status === 'pending') {
      setPipelineError('This test is pending review and cannot run yet.');
      return;
    }

    setIsRunningPlaywright(true);
    setPipelineError('');
    setPipelineMessage(`Running “${selected.scenario}” on ${selectedEnvironment}...`);
    try {
      const response = await fetch('/api/tests/run-specific', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: selectedEnvironment,
          browser: pipelineBrowser === 'all' ? 'chromium' : pipelineBrowser,
          testId: selected.id,
          testName: selected.scenario,
          headed: playwrightHeaded,
          workers: playwrightWorkers,
        }),
      });
      const data = await response.json();
      setPipelineMessage(response.ok ? `“${selected.scenario}” passed.` : `“${selected.scenario}” completed with failures.`);
      if (!response.ok) setPipelineError(data.error || data.stderr || 'Specific test execution failed');
      await loadPipelineDashboard(true);
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : 'Specific test execution failed');
    } finally {
      setIsRunningPlaywright(false);
    }
  }

  async function rerunFailedBddTests() {
    setIsRunningPlaywright(true);
    setPipelineError('');
    setPipelineMessage('Re-running the last failed BDD scenarios...');

    try {
      const response = await fetch('/api/test-runs/rerun-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headed: playwrightHeaded, workers: playwrightWorkers }),
      });
      const data = await response.json();
      setPipelineMessage(response.ok ? 'Failed scenarios were re-run.' : 'The failed-test re-run completed with failures.');
      if (!response.ok) throw new Error(data.error || data.stderr || 'Failed-test re-run failed');
      await loadPipelineDashboard(true);
    } catch (error) {
      setPipelineError(error instanceof Error ? error.message : 'Failed-test re-run failed');
    } finally {
      setIsRunningPlaywright(false);
    }
  }

  async function loadAssistantTickets() {
    setIsAssistantBusy(true);
    setAssistantError('');

    try {
      const response = await fetch('/api/jira/tickets');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to read Jira tickets');
      }

      setAssistantTickets(data.tickets);
      setSelectedAssistantTicket(data.tickets[0] || null);
      setSelectedQaAssignee('All tickets');
      setAssistantAnalysis(null);
      setScriptSuggestion(null);
      setQaCommentPreview('');
      setApprovalMessage('');
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Failed to read Jira tickets');
    } finally {
      setIsAssistantBusy(false);
    }
  }

  async function analyzeAssistantTicket(ticket = selectedAssistantTicket) {
    if (!ticket) return;
    setIsAssistantBusy(true);
    setAssistantError('');
    setApprovalMessage('');

    try {
      const response = await fetch('/api/qa/analyze-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketKey: ticket.key, environment: selectedEnvironment }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze ticket');
      }

      setAssistantAnalysis(data.analysis);
      setScriptSuggestion(null);
      setQaCommentPreview('');
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Failed to analyze ticket');
    } finally {
      setIsAssistantBusy(false);
    }
  }

  async function generateAssistantScript() {
    if (!selectedAssistantTicket) return;
    setIsAssistantBusy(true);
    setAssistantError('');

    try {
      const response = await fetch('/api/qa/generate-playwright-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketKey: selectedAssistantTicket.key, environment: selectedEnvironment }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Playwright script');
      }

      setScriptSuggestion(data.script);
      setApprovalMessage('Generated script is ready for review.');
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Failed to generate Playwright script');
    } finally {
      setIsAssistantBusy(false);
    }
  }

  async function approveAssistantScript() {
    if (!scriptSuggestion) return;
    setIsAssistantBusy(true);
    setAssistantError('');

    try {
      const fileName = scriptSuggestion.suggested_file_path.split('/').pop();
      const response = await fetch('/api/qa/approve-generated-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, module: scriptSuggestion.module }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve script');
      }

      setApprovalMessage(`Approved and added to ${data.target}`);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Failed to approve script');
    } finally {
      setIsAssistantBusy(false);
    }
  }

  function rejectAssistantScript() {
    setScriptSuggestion(null);
    setAssistantError('');
    setApprovalMessage('Generated script rejected. No Playwright file was added.');
  }

  async function preparePassedQaComment() {
    if (!selectedAssistantTicket || !assistantAnalysis) return;
    setIsAssistantBusy(true);
    setAssistantError('');
    setApprovalMessage('');

    try {
      const response = await fetch('/api/qa/generate-passed-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketKey: selectedAssistantTicket.key, environment: selectedEnvironment, analysis: assistantAnalysis }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to prepare QA comment');
      }

      setQaCommentPreview(data.comment || '');
      setApprovalMessage('QA pass comment prepared. Review it, then confirm before posting to Jira.');
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Failed to prepare QA comment');
    } finally {
      setIsAssistantBusy(false);
    }
  }

  async function postPassedQaComment() {
    if (!selectedAssistantTicket || !qaCommentPreview.trim()) return;

    const confirmed = window.confirm(`Add this QA pass comment to ${selectedAssistantTicket.key} in Jira?`);
    if (!confirmed) {
      return;
    }

    setIsAssistantBusy(true);
    setAssistantError('');
    setApprovalMessage('');

    try {
      const response = await fetch(`/api/jira/tickets/${encodeURIComponent(selectedAssistantTicket.key)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: qaCommentPreview }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add Jira comment');
      }

      setApprovalMessage(`QA pass comment added to ${data.ticketKey || selectedAssistantTicket.key}.`);
    } catch (error) {
      setAssistantError(error instanceof Error ? error.message : 'Failed to add Jira comment');
    } finally {
      setIsAssistantBusy(false);
    }
  }

  async function startRecorder() {
    setIsRecorderBusy(true);
    setRecorderError('');
    setRecorderMessage('Launching a real Playwright browser...');

    try {
      const response = await fetch(recorderApi('/api/recorder/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: recorderUrl,
          browser: recorderBrowser,
          workspaceId: 'existing-workspace',
          environment: recorderEnvironment,
        }),
      });
      const data = await readApiJson(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start recorder');
      }

      setRecorderStatus(data);
      setRecorderDraft(data.draft || null);
      setRecorderActions([]);
      setRecorderFiles([]);
      setRecorderMessage('Browser launched. Use the opened browser normally; actions will appear here live.');
      await loadRecorderSnapshot(data.recordingId, true);
    } catch (error) {
      setRecorderError(error instanceof Error ? error.message : 'Failed to start recorder');
    } finally {
      setIsRecorderBusy(false);
    }
  }

  async function controlRecorder(command: 'pause' | 'resume' | 'stop' | 'finalize') {
    if (!recorderStatus?.recordingId) return;
    setIsRecorderBusy(true);
    setRecorderError('');
    setRecorderMessage('');

    try {
      const response = await fetch(recorderApi(`/api/recorder/${encodeURIComponent(recorderStatus.recordingId)}/${command}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: command === 'finalize' ? JSON.stringify({
          featureName: recorderDraft?.feature || '',
          scenarioName: recorderDraft?.scenario || '',
          module: recorderDraft?.module || '',
          suite: 'Smoke',
          tags: ['@ui', '@generated'],
        }) : '{}',
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data.error || `Failed to ${command} recorder`);
      setRecorderStatus(data.recordingId ? data : { ...recorderStatus, status: command });
      setRecorderDraft(data.draft || data.recording?.draft || data.draft || recorderDraft);
      setRecorderMessage(command === 'stop' ? 'Recording stopped. Review and finalize the generated files.' : `Recorder ${command} completed.`);
      await loadRecorderSnapshot(recorderStatus.recordingId, true);
    } catch (error) {
      setRecorderError(error instanceof Error ? error.message : `Failed to ${command} recorder`);
    } finally {
      setIsRecorderBusy(false);
    }
  }

  async function loadRecorderSnapshot(recordingId = recorderStatus?.recordingId || '', quiet = false) {
    if (!recordingId) return;
    if (!quiet) setIsRecorderBusy(true);
    try {
      const [statusResponse, actionsResponse, filesResponse] = await Promise.all([
        fetch(recorderApi(`/api/recorder/${encodeURIComponent(recordingId)}/status`)),
        fetch(recorderApi(`/api/recorder/${encodeURIComponent(recordingId)}/actions`)),
        fetch(recorderApi(`/api/recorder/${encodeURIComponent(recordingId)}/generated-files`)),
      ]);
      const [statusData, actionsData, filesData] = await Promise.all([
        readApiJson(statusResponse),
        readApiJson(actionsResponse),
        readApiJson(filesResponse),
      ]);
      if (!statusResponse.ok) throw new Error(statusData.error || 'Failed to load recorder status');
      setRecorderStatus(statusData);
      setRecorderDraft(statusData.draft || null);
      setRecorderActions(actionsData.actions || []);
      setRecorderFiles(filesData.files || []);
    } catch (error) {
      if (!quiet) setRecorderError(error instanceof Error ? error.message : 'Failed to refresh recorder');
    } finally {
      if (!quiet) setIsRecorderBusy(false);
    }
  }

  async function approveRecorderDraft() {
    if (!recorderStatus?.recordingId || !recorderDraft) return;
    setIsRecorderBusy(true);
    setRecorderError('');
    setRecorderMessage('');

    try {
      const response = await fetch(recorderApi(`/api/recorder/${encodeURIComponent(recorderStatus.recordingId)}/approve`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await readApiJson(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve recorder automation');
      }

      setRecorderMessage(`Approved ${data.files?.length || 0} generated file(s) into the framework.`);
      await loadPipelineDashboard(true);
    } catch (error) {
      setRecorderError(error instanceof Error ? error.message : 'Failed to approve recorder automation');
    } finally {
      setIsRecorderBusy(false);
    }
  }

  const selectedEnvironmentDetails = environments.find((environment) => environment.id === selectedEnvironment);

  return (
    <main>
      <section className="hero">
        <nav className="nav">
          <div className="brand">
            <div className="brandIcon"><Bot size={22} /></div>
            <span>QA AI Framework</span>
          </div>
          <div className="navLinks">
            <a href="#ai-recorder">AI Recorder</a>
            <a href="#jira-assistant">Jira Assistant</a>
            <a href="#agentic-pipeline">Automation & Reports</a>
          </div>
          <div className="themeToggle" aria-label="Theme selector">
            <button className={theme === 'dark' ? 'active' : ''} type="button" onClick={() => setTheme('dark')}>Dark</button>
            <button className={theme === 'light' ? 'active' : ''} type="button" onClick={() => setTheme('light')}>Light</button>
          </div>
        </nav>

        <div className="heroGrid heroGridCompact">
          <div>
            <div className="eyebrow"><Sparkles size={16} /> AI-augmented QA workspace</div>
            <h1>Analyze tickets. Run tests. Review evidence.</h1>
            <p className="heroText">
              One focused workspace for Jira QA analysis, manual sign-off, Playwright and BDD execution, test inventory, and reports.
            </p>
            <div className="ctaRow">
              <a className="primaryBtn" href="#ai-recorder">Record a flow</a>
              <a className="primaryBtn" href="#jira-assistant">Analyze a ticket</a>
              <a className="secondaryBtn" href="#agentic-pipeline">Run automation</a>
            </div>
          </div>
        </div>
      </section>

      {false && <>
      <section id="architecture" className="section">
        <SectionHeader icon={<Network />} title="Reference Architecture" subtitle="OpenAPI is the stable service plane; MCP is the AI-facing tool, prompt, and resource plane." />
        <div className="architecture">
          {services.map((service) => (
            <ArchitectureNode key={service.title} icon={service.icon} title={service.title} text={service.text} featured={service.featured} />
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<TestTube2 />} title="Refined Product Scope" subtitle="A credible phase-one boundary for ticket-to-test intelligence." />
        <div className="decisionGrid">
          {scope.map((item) => (
            <div className="decisionCard" key={item.label}>
              <strong>{item.label}</strong>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section split">
        <div>
          <SectionHeader icon={<Braces />} title="Structured AI Artifacts" subtitle="Every model handoff is schema-valid and machine-consumable." />
          <div className="artifactList">
            {artifacts.map((artifact) => (
              <div className="artifactItem" key={artifact.name}>
                <FileJson size={18} />
                <div>
                  <strong>{artifact.name}</strong>
                  <p>{artifact.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="codePanel">
          <div className="codeTitle">RequirementContract</div>
          <pre>{`{
  "issueKey": "QA-123",
  "source": "jira",
  "actors": ["customer", "admin"],
  "acceptanceCriteria": ["..."],
  "businessRules": ["..."],
  "riskLevel": "high",
  "dependencies": ["payments-api"],
  "ambiguityQuestions": ["..."],
  "schemaVersion": "1.0.0"
}`}</pre>
        </div>
      </section>

      <section id="workflow" className="section">
        <SectionHeader icon={<Workflow />} title="Ticket-first and Site-first Workflow" subtitle="A staged pipeline that keeps reasoning, generation, validation, and publishing separate." />
        <div className="timeline">
          {workflow.map((item, index) => (
            <div className="timelineItem" key={item.stage}>
              <div className="timelineNumber">{index + 1}</div>
              <div>
                <strong>{item.stage}</strong>
                <p>{item.output}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<PlugZap />} title="Platform Integrations" subtitle="Provider-agnostic adapters with Jira as the first-class issue implementation." />
        <div className="cardGrid">
          {integrations.map((integration) => (
            <div className="card" key={integration.name}>
              <h3>{integration.name}</h3>
              <p>{integration.detail}</p>
            </div>
          ))}
        </div>
      </section>
      </>}

      <section className="section" id="ai-recorder">
        <SectionHeader icon={<MousePointerClick />} title="Playwright Live Recorder and Dynamic Framework Builder" subtitle="Enter a website URL and perform a user flow in the opened browser. The application records your actions and automatically builds a reusable Playwright POM and BDD test. Review the generated files, add them to your framework, and run the test again directly from the dashboard." />
        <div className="recorderShell">
          <div className="recorderToolbar">
            <label className="recorderUrlField">
              <span>Website URL</span>
              <input value={recorderUrl} onChange={(event) => setRecorderUrl(event.target.value)} placeholder="https://example.com" />
            </label>
            <label className="recorderUrlField">
              <span>Browser</span>
              <select value={recorderBrowser} onChange={(event) => setRecorderBrowser(event.target.value as typeof recorderBrowser)}>
                <option value="chromium">Chromium</option>
                <option value="firefox">Firefox</option>
                <option value="webkit">WebKit</option>
                <option value="msedge">Microsoft Edge</option>
              </select>
            </label>
            <label className="recorderUrlField">
              <span>Environment</span>
              <select value={recorderEnvironment} onChange={(event) => setRecorderEnvironment(event.target.value)}>
                {['Local', 'Development', 'QA', 'Staging', 'UAT', 'Production', 'Custom'].map((environment) => <option key={environment} value={environment}>{environment}</option>)}
              </select>
            </label>
            <button className="primaryBtn" type="button" onClick={startRecorder} disabled={isRecorderBusy || recorderStatus?.status === 'recording'}>
              {isRecorderBusy ? 'Working...' : 'Start Recording'}
            </button>
            <button className="secondaryBtn" type="button" onClick={() => controlRecorder('pause')} disabled={recorderStatus?.status !== 'recording' || isRecorderBusy}>
              Pause
            </button>
            <button className="secondaryBtn" type="button" onClick={() => controlRecorder('resume')} disabled={recorderStatus?.status !== 'paused' || isRecorderBusy}>
              Resume
            </button>
            <button className="secondaryBtn" type="button" onClick={() => controlRecorder('stop')} disabled={!recorderStatus?.recordingId || ['stopped', 'finalized'].includes(recorderStatus.status) || isRecorderBusy}>
              Stop
            </button>
            <button className="secondaryBtn" type="button" onClick={() => controlRecorder('finalize')} disabled={!recorderStatus?.recordingId || !recorderActions.length || isRecorderBusy}>
              Finalize
            </button>
            <button className="secondaryBtn" type="button" onClick={approveRecorderDraft} disabled={!recorderDraft || isRecorderBusy}>
              Approve and Add
            </button>
          </div>

          {recorderMessage && <p className="successText">{recorderMessage}</p>}
          {recorderError && <p className="errorText">{recorderError}</p>}

          <div className="recorderStatusGrid">
            <MetaItem label="Status" value={recorderStatus?.status || 'No active recording'} />
            <MetaItem label="Current URL" value={recorderStatus?.currentUrl || 'No browser launched'} />
            <MetaItem label="Page title" value={recorderStatus?.pageTitle || 'N/A'} />
            <MetaItem label="Actions" value={String(recorderStatus?.actionCount || recorderActions.length || 0)} />
          </div>
          {recorderStatus?.navigationError && <p className="errorText">{recorderStatus.navigationError}</p>}

          <div className="recorderGrid">
            <div className="recorderPanel">
              <div className="panelTitle">
                <strong>Live timeline</strong>
                <span>{recorderActions.length} real actions</span>
              </div>
              <div className="recorderTimeline">
                {recorderActions.length ? recorderActions.map((action) => (
                  <article className="recorderStep" key={action.stepId}>
                    <div className="timelineNumber">{String(action.sequence).padStart(2, '0')}</div>
                    <div>
                      <strong>{action.generatedStep || action.actionType}</strong>
                      <p>{action.actionType} / {action.element.accessibleName || action.element.text || action.element.tagName}</p>
                      <code>{action.primaryLocator?.value}</code>
                    </div>
                  </article>
                )) : <div className="pipelineEmpty">No recorded flows are available. Enter a URL and start recording.</div>}
              </div>
            </div>

            <div className="recorderPanel">
              <div className="panelTitle">
                <strong>Live generated framework</strong>
                <span>{recorderDraft ? `${recorderDraft.review.confidenceScore}% confidence` : 'Pending'}</span>
              </div>
              {recorderDraft ? (
                <>
                  <div className="recorderSummaryGrid">
                    <MetaItem label="Feature" value={recorderDraft.review.detectedFeature} />
                    <MetaItem label="Scenario" value={recorderDraft.review.detectedScenario} />
                    <MetaItem label="Module" value={recorderDraft.module} />
                    <MetaItem label="Recording" value={recorderDraft.recordingId} />
                  </div>
                  <div className="chipRow">
                    {recorderDraft.generatedFiles.map((file) => <span key={file}>{file}</span>)}
                  </div>
                  {recorderStatus?.validation?.warnings?.length ? (
                    <ul className="checkList">
                      {recorderStatus.validation.warnings.map((warning) => <li key={warning}><AlertTriangle size={18} /> {warning}</li>)}
                    </ul>
                  ) : null}
                  <div className="recorderSelectorList">
                    {recorderDraft.review.generatedSelectors.slice(0, 5).map((selector) => (
                      <div className="mcpToolCard" key={selector.stepId}>
                        <code>{selector.stepId} / {selector.strategy}</code>
                        <p>{selector.primary}</p>
                      </div>
                    ))}
                  </div>
                  <ul className="checkList">
                    {recorderDraft.review.potentialProblems.map((problem) => <li key={problem}><AlertTriangle size={18} /> {problem}</li>)}
                  </ul>
                  <div className="recorderFilePreview">
                    {recorderFiles.slice(0, 3).map((file) => (
                      <details className="scriptPreviewAccordion" key={file.path}>
                        <summary><span>{file.path}</span></summary>
                        <pre>{file.content || 'File will appear after the first recorded action.'}</pre>
                      </details>
                    ))}
                  </div>
                </>
              ) : (
                <div className="pipelineEmpty">
                  No generated tests are available. Record and approve a browser flow first.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="jira-assistant">
        <SectionHeader icon={<Bot />} title="Jira Ticket QA Assistant" subtitle="Load scoped Jira tickets, filter by QA owner, analyze risk, and approve Playwright coverage from one workspace." />
        <div className="assistantShell">
          <div className="assistantToolbar">
            <div>
              <div className="eyebrow"><PlugZap size={16} /> Jira Cloud connected through /rest/api/3/search/jql</div>
              <h3>Scoped Jira ticket workspace</h3>
              <p>Load all matching EGO APP and VSF2 tickets first, then filter by QA assignee when needed.</p>
            </div>
            <div className="runnerControls">
              <label className="compactField">
                <span>Testing environment</span>
                <select value={selectedEnvironment} onChange={(event) => setSelectedEnvironment(event.target.value)}>
                  {environments.length
                    ? environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)
                    : <option value="CF_UK">CF UK</option>}
                </select>
              </label>
              <button className="primaryBtn" type="button" onClick={loadAssistantTickets} disabled={isAssistantBusy}>
                {isAssistantBusy ? 'Loading Jira...' : 'Load Scoped Tickets'}
              </button>
              <button className="secondaryBtn" type="button" onClick={() => analyzeAssistantTicket()} disabled={!selectedAssistantTicket || isAssistantBusy}>
                Analyze Ticket
              </button>
              <button className="secondaryBtn" type="button" onClick={generateAssistantScript} disabled={!assistantAnalysis || isAssistantBusy}>
                Generate Script
              </button>
            </div>
          </div>

          <div className="environmentContext" role="status">
            <strong>Testing Environment: {selectedEnvironmentDetails?.name || selectedEnvironment.replace('_', ' ')}</strong>
            <a href={selectedEnvironmentDetails?.url} target="_blank" rel="noreferrer">{selectedEnvironmentDetails?.url || 'Environment URL unavailable'}</a>
            {assistantAnalysis && /order|checkout|payment/i.test(`${selectedAssistantTicket?.title} ${selectedAssistantTicket?.description}`) && !selectedEnvironment.startsWith('UAT1') && (
              <span><AlertTriangle size={15} /> Use UAT1 for placed-order or payment scenarios.</span>
            )}
          </div>

          <div className="assistantScopeBar">
            <div className="jiraFilters">
              {jiraScopedFilters.map((filter) => (
                <span key={filter}>{filter}</span>
              ))}
            </div>
            <div className="runnerControls">
              <select value={selectedQaAssignee} onChange={(event) => setSelectedQaAssignee(event.target.value)}>
                {qaAssigneeFilters.map((assignee) => (
                  <option key={assignee} value={assignee}>{assignee}</option>
                ))}
              </select>
              <a className="secondaryBtn" href="https://egoshoes.atlassian.net/" target="_blank" rel="noreferrer">
                Open Jira
              </a>
            </div>
          </div>

          {(assistantError || approvalMessage) && (
            <div className="assistantNotice">
              {assistantError && <p className="errorText">{assistantError}</p>}
              {approvalMessage && <p className="successText">{approvalMessage}</p>}
            </div>
          )}

          <div className="assistantWorkspace">
            <aside className="assistantSidebar">
              <div className="panelTitle">
                <strong>Jira Tickets</strong>
                <span>{filteredAssistantTickets.length} of {assistantTickets.length}</span>
              </div>
              <div className="jiraFilters">
                <a href="https://egoshoes.atlassian.net/" target="_blank" rel="noreferrer">egoshoes.atlassian.net</a>
                <span>{selectedQaAssignee}</span>
              </div>
              <div className="ticketStack">
                {assistantTickets.length === 0 ? (
                  <div className="emptyState">Click Load Scoped Tickets to read EGO APP and VSF2 tickets from the selected statuses.</div>
                ) : filteredAssistantTickets.length === 0 ? (
                  <div className="emptyState">No loaded tickets match this QA assignee filter.</div>
                ) : (
                  filteredAssistantTickets.map((ticket) => (
                    <button
                      className={`ticketCard selectableCard ${selectedAssistantTicket?.key === ticket.key ? 'selectedCard' : ''}`}
                      key={ticket.key}
                      type="button"
                      onClick={() => {
                        setSelectedAssistantTicket(ticket);
                        setAssistantAnalysis(null);
                        setScriptSuggestion(null);
                        setQaCommentPreview('');
                        setApprovalMessage('');
                      }}
                    >
                      <div className="ticketHeader">
                        <strong>{ticket.key}</strong>
                        <span>{ticket.status}</span>
                      </div>
                      <p className="ticketSummary">{ticket.title}</p>
                      <div className="ticketMetaGrid">
                        <MetaItem label="Priority" value={ticket.priority} />
                        <MetaItem label="Owner" value={ticket.assignee} />
                        <MetaItem label="Updated" value={formatDate(ticket.updated)} />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div className="assistantMain">
              <TicketDetailView ticket={selectedAssistantTicket} />

              {assistantAnalysis && (
                <QAAnalysisPanel
                  analysis={assistantAnalysis}
                  scriptSuggestion={scriptSuggestion}
                  qaCommentPreview={qaCommentPreview}
                  isBusy={isAssistantBusy}
                  onApproveScript={approveAssistantScript}
                  onRejectScript={rejectAssistantScript}
                  onPreparePassedComment={preparePassedQaComment}
                  onPostPassedComment={postPassedQaComment}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="agentic-pipeline">
        <SectionHeader
          icon={<Play />}
          title="Agentic QA Automation Pipeline"
          subtitle="Run Playwright or BDD automation from the app, then review execution evidence and reports."
        />

        <div className="pipelineDashboard">
          <div className="pipelineOverview">
            <div>
              <div className="eyebrow"><Radio size={15} /> Execution control</div>
              <h3>Run reviewed QA automation</h3>
              <p>Select an environment, browser, suite or test, and execution mode. Results, failures, screenshots, traces, and reports appear below.</p>
            </div>
            <div className={`pipelineHealth ${pipelineSummary?.totals.failed ? 'hasFailures' : ''}`}>
              <span className="pipelineStatusDot" aria-hidden="true" />
              <div>
                <strong>{pipelineSummary?.generatedAt ? 'Latest run loaded' : 'Awaiting first run'}</strong>
                <small>{pipelineSummary?.generatedAt ? formatDateTime(pipelineSummary.generatedAt) : 'No execution summary exists yet'}</small>
              </div>
            </div>
          </div>

          <ol className="pipelineWorkflow" aria-label="Automation workflow">
            {['Select environment', 'Select browser', 'Choose suite or test', 'Choose headed or headless', 'Run tests', 'View reports'].map((step) => <li key={step}>{step}</li>)}
          </ol>

          <div className="pipelineMetrics" aria-label="Latest BDD execution metrics">
            <Metric value={String(pipelineSummary?.totals.total ?? 0)} label="Scenarios" />
            <Metric value={String(pipelineSummary?.totals.passed ?? 0)} label="Passed" />
            <Metric value={String(pipelineSummary?.totals.failed ?? 0)} label="Failed" />
            <Metric value={String(pipelineSummary?.totals.skipped ?? 0)} label="Skipped" />
            <Metric
              value={String(Object.values(pipelineReports).filter((report) => report.exists).length)}
              label="Reports ready"
            />
          </div>
          {!pipelineSummary?.generatedAt && (
            <div className="pipelineEmpty">No test results available yet. Run automation to generate reports.</div>
          )}

          <div className="pipelineControlPanel">
            <div className="pipelineControlHeader">
              <div>
                <strong>Configure execution</strong>
                <p>CI defaults to Chromium smoke. Manual runs can expand browser and suite coverage.</p>
              </div>
              <span className="safeModeBadge"><ShieldCheck size={15} /> Destructive tests {allowDestructive ? 'enabled' : 'blocked'}</span>
            </div>

            <div className="pipelineControlGrid">
              <label>
                <span>Environment</span>
                <select value={selectedEnvironment} onChange={(event) => setSelectedEnvironment(event.target.value)}>
                  {environments.length
                    ? environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)
                    : <option value="CF_UK">CF UK</option>}
                </select>
              </label>
              <label>
                <span>Browser</span>
                <select value={pipelineBrowser} onChange={(event) => setPipelineBrowser(event.target.value as typeof pipelineBrowser)}>
                  <option value="chromium">Chromium</option>
                  <option value="firefox">Firefox</option>
                  <option value="webkit">WebKit</option>
                  <option value="all">All browsers</option>
                </select>
              </label>
              <label>
                <span>Run</span>
                <select value={executionMode} onChange={(event) => setExecutionMode(event.target.value as typeof executionMode)}>
                  <option value="suite">Test suite</option>
                  <option value="specific">Specific test</option>
                </select>
              </label>
              {executionMode === 'suite' ? <label>
                <span>Test suite</span>
                <select value={pipelineSuite} onChange={(event) => setPipelineSuite(event.target.value as typeof pipelineSuite)}>
                  <option value="smoke">Smoke</option>
                  <option value="auth">Authentication</option>
                  <option value="login">Login</option>
                  <option value="homepage">Homepage</option>
                  <option value="regression">Regression</option>
                  <option value="bdd">BDD</option>
                  <option value="all-stable">All stable</option>
                </select>
              </label> : <label className="wideField">
                <span>Specific test</span>
                <select value={selectedTestId} onChange={(event) => setSelectedTestId(event.target.value)}>
                  <option value="">Select a Playwright or BDD test</option>
                  {(testInventory?.items || []).filter((item) => item.status !== 'pending').map((item) => (
                    <option key={item.id} value={item.id}>{item.scenario} · {item.framework}</option>
                  ))}
                </select>
              </label>}
              <label>
                <span>Workers</span>
                <select value={playwrightWorkers} onChange={(event) => setPlaywrightWorkers(Number(event.target.value))}>
                  <option value={1}>1 worker</option>
                  <option value={2}>2 workers</option>
                  <option value={3}>3 workers</option>
                  <option value={4}>4 workers</option>
                </select>
              </label>
              <label>
                <span>Jira filter (optional)</span>
                <input
                  value={pipelineJiraKey}
                  onChange={(event) => setPipelineJiraKey(event.target.value.toUpperCase())}
                  placeholder="VSF2-784"
                  pattern="[A-Z][A-Z0-9]+-[0-9]+"
                />
              </label>
            </div>

            <div className="pipelineToggles">
              <label className="toggleControl">
                <input type="checkbox" checked={playwrightHeaded} onChange={(event) => setPlaywrightHeaded(event.target.checked)} />
                <span>Headed browser</span>
              </label>
              <label className={`toggleControl destructiveToggle ${allowDestructive ? 'active' : ''}`}>
                <input type="checkbox" checked={allowDestructive} onChange={(event) => setAllowDestructive(event.target.checked)} />
                <span>Allow destructive tests</span>
              </label>
            </div>

            {allowDestructive && (
              <div className="destructiveWarning" role="alert">
                <AlertTriangle size={18} />
                <span>Use only in an isolated QA environment. Registration submission, order placement, payment, and deletion can change real data.</span>
              </div>
            )}

            <div className="pipelineActions">
              <button className="primaryBtn" type="button" onClick={runBddPipeline} disabled={isRunningPlaywright}>
                <Play size={16} />
                {isRunningPlaywright ? 'Tests running…' : executionMode === 'specific' ? 'Run selected test' : `Run ${pipelineSuite}`}
              </button>
              <button className="secondaryBtn" type="button" onClick={rerunFailedBddTests} disabled={isRunningPlaywright || pipelineFailures.length === 0}>
                <RotateCcw size={16} /> Re-run failed
              </button>
              <button className="secondaryBtn" type="button" onClick={() => loadPipelineDashboard()} disabled={isLoadingPipeline}>
                <RefreshCw size={16} className={isLoadingPipeline ? 'spinIcon' : ''} /> Refresh output
              </button>
            </div>

            {pipelineMessage && <p className="pipelineNotice" role="status">{pipelineMessage}</p>}
            {pipelineError && <p className="errorText" role="alert">{pipelineError}</p>}
          </div>

          <div className="pipelinePanel inventoryPanel">
            <div className="pipelinePanelHeader">
              <div>
                <span className="panelKicker">Complete inventory</span>
                <h3>All Playwright and BDD tests</h3>
              </div>
              <span>{filteredTestInventory.length} of {testInventory?.totals.all ?? 0}</span>
            </div>
            <div className="inventoryMetrics">
              <span><strong>{testInventory?.totals.active ?? 0}</strong> Active</span>
              <span><strong>{testInventory?.totals.manual ?? 0}</strong> Manual</span>
              <span><strong>{testInventory?.totals.unstable ?? 0}</strong> Unstable</span>
              <span><strong>{testInventory?.totals.destructive ?? 0}</strong> Destructive</span>
              <span><strong>{testInventory?.totals.pending ?? 0}</strong> Pending review</span>
            </div>
            <div className="inventoryFilters">
              <label>
                <span>Search tests</span>
                <input
                  type="search"
                  value={inventoryQuery}
                  onChange={(event) => setInventoryQuery(event.target.value)}
                  placeholder="Scenario, Jira, AC, module, tag…"
                />
              </label>
              <label>
                <span>Source</span>
                <select value={inventorySource} onChange={(event) => setInventorySource(event.target.value)}>
                  <option value="all">All sources</option>
                  <option value="bdd">Active BDD</option>
                  <option value="legacy">Legacy Playwright</option>
                  <option value="pending">Pending review</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={inventoryStatus} onChange={(event) => setInventoryStatus(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="manual">Manual</option>
                  <option value="unstable">Unstable</option>
                  <option value="destructive">Destructive</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
            </div>
            <div className="inventoryList">
              {isLoadingPipeline ? (
                <div className="pipelineEmpty">Loading tests from Playwright specs and BDD feature files…</div>
              ) : !filteredTestInventory.length ? (
                <div className="pipelineEmpty">No tests match the selected inventory filters.</div>
              ) : filteredTestInventory.map((item) => (
                <details className="inventoryRow" key={item.id}>
                  <summary>
                    <span className={`inventoryStatus ${item.status}`}>{item.status}</span>
                    <strong>{item.scenario}</strong>
                    <span>{item.framework}</span>
                    <span>{item.module}</span>
                  </summary>
                  <div className="inventoryDetails">
                    <div><span>Source</span><strong>{item.source}</strong></div>
                    <div><span>Jira</span><strong>{item.jira || 'Unmapped'}</strong></div>
                    <div><span>Acceptance criteria</span><strong>{item.acceptanceCriteria.join(', ') || 'Missing'}</strong></div>
                    <div><span>Coverage</span><strong>{item.coverage}</strong></div>
                    <div><span>Last run</span><strong className={`resultBadge ${item.lastRunStatus}`}>{item.lastRunStatus}</strong></div>
                    <code>{item.file}</code>
                    <div className="scenarioTags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <button className="secondaryBtn inventoryRunButton" type="button" disabled={isRunningPlaywright || item.status === 'pending'} onClick={() => void runSpecificTest(item.id)}>
                      <Play size={15} /> Run test
                    </button>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="pipelineColumns">
            <div className="pipelinePanel">
              <div className="pipelinePanelHeader">
                <div>
                  <span className="panelKicker">Acceptance criteria</span>
                  <h3>Functional coverage map</h3>
                </div>
                <span>{acceptanceInventory.length} scenario(s)</span>
              </div>
              <div className="scenarioStack">
                {!acceptanceInventory.length ? (
                  <div className="pipelineEmpty">No BDD acceptance-criteria mappings were found.</div>
                ) : acceptanceInventory.map((item) => {
                  const execution = findLatestExecution(item, pipelineSummary);
                  return (
                  <details className="scenarioRow coverageScenario" key={item.id}>
                    <summary>
                    <div className="scenarioTopline">
                      <span className={`resultBadge ${execution?.status || item.status}`}>
                        {execution?.status || item.status}
                      </span>
                      <span>{item.source}</span>
                      {execution && <span>{execution.browser} · {formatDuration(execution.duration)}</span>}
                    </div>
                    <strong>{item.scenario}</strong>
                    <div className="scenarioTags">
                      <span>{item.jira || 'Jira unmapped'}</span>
                      <span>{item.acceptanceCriteria.join(', ') || 'AC missing'}</span>
                      <span className={`coverageTag ${item.coverage}`}>
                        {item.coverage}
                      </span>
                    </div>
                    </summary>
                    <div className="coverageDetails">
                      <p><strong>Feature:</strong> {item.feature}</p>
                      <p><strong>Module:</strong> {item.module} · <strong>Priority:</strong> {item.priority} · <strong>Risk:</strong> {item.risk}</p>
                      <code>{item.file}</code>
                      <p>{coverageGuidance(item.coverage, item.status)}</p>
                    </div>
                  </details>
                )})}
              </div>
            </div>

            <div className="pipelinePanel">
              <div className="pipelinePanelHeader">
                <div>
                  <span className="panelKicker">Live NDJSON</span>
                  <h3>Execution stream</h3>
                </div>
                <span>{pipelineEvents.length} recent</span>
              </div>
              <div className="eventStream" aria-live="polite">
                {!pipelineEvents.length ? (
                  <div className="pipelineEmpty">Events appear here as scenarios start, pass, fail, or skip.</div>
                ) : pipelineEvents.map((event, index) => (
                  <div className="eventRow" key={`${event.timestamp}-${event.type}-${index}`}>
                    <span className={`eventIcon ${event.type} ${event.status || ''}`} aria-hidden="true" />
                    <div>
                      <strong>{event.type.replace(/_/g, ' ')}</strong>
                      <p>{event.scenario || event.feature || event.status || 'Pipeline lifecycle event'}</p>
                      <small>{event.browser ? `${event.browser} · ` : ''}{formatDateTime(event.timestamp)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pipelinePanel">
            <div className="pipelinePanelHeader">
              <div>
                <span className="panelKicker">Evidence package</span>
                <h3>Dashboard-ready reports</h3>
              </div>
              <span>{Object.values(pipelineReports).filter((report) => report.exists).length} available</span>
            </div>
            <div className="reportGrid">
              {Object.entries(pipelineReports).map(([name, report]) => (
                <a
                  className={`reportCard ${report.exists ? 'ready' : ''}`}
                  key={name}
                  href={report.exists && report.url ? report.url : undefined}
                  target={report.exists && report.url ? '_blank' : undefined}
                  rel="noreferrer"
                  aria-disabled={!report.exists}
                >
                  <FileJson size={19} />
                  <div>
                    <strong>{reportLabel(name)}</strong>
                    <code>{report.path}</code>
                  </div>
                  <span>{report.exists ? 'Open' : 'Not generated'}</span>
                </a>
              ))}
              {!Object.keys(pipelineReports).length && <div className="pipelineEmpty">Report catalog is loading.</div>}
            </div>
          </div>

          <div className="pipelinePanel allurePanel">
            <div className="pipelinePanelHeader">
              <div>
                <span className="panelKicker">Interactive report</span>
                <h3>Allure test report</h3>
                <p>Detailed execution history, steps, screenshots, traces, failures, and trends.</p>
              </div>
              {pipelineReports.allureReport?.exists && (
                <a
                  className="reportOpenLink"
                  href="/api/test-runs/artifacts/allure/index.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full report
                </a>
              )}
            </div>
            {pipelineReports.allureReport?.exists ? (
              <iframe
                className="allureFrame"
                title="Allure test report"
                src="/api/test-runs/artifacts/allure/index.html"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-downloads"
              />
            ) : (
              <div className="pipelineEmpty">
                Allure report not generated yet. Run tests first, then generate it with <code>npm run report:allure</code>. Open Playwright reports with <code>npm run report:open</code>.
              </div>
            )}
          </div>

          <div className="pipelinePanel failureTriagePanel">
            <div className="pipelinePanelHeader">
              <div>
                <span className="panelKicker">Agentic triage</span>
                <h3>Failure cards</h3>
              </div>
              <span>{pipelineFailures.length} open</span>
            </div>
            {!pipelineFailures.length ? (
              <div className="pipelineEmpty successEmpty"><CheckCircle2 size={19} /> No failure triage cards in the latest output.</div>
            ) : (
              <div className="failureCardGrid">
                {pipelineFailures.map((failure, index) => (
                  <article className="failureCard" key={`${failure.testTitle}-${failure.browser}-${index}`}>
                    <div className="failureCardHeader">
                      <span>{failure.suggestedFailureType}</span>
                      <small>{failure.browser}</small>
                    </div>
                    <h4>{failure.scenario}</h4>
                    <p>{failure.errorMessage}</p>
                    <div className="failureAction">
                      <strong>Suggested next action</strong>
                      <span>{failure.suggestedNextAction}</span>
                    </div>
                    <code>{failure.rerunCommand}</code>
                    <div className="evidenceChips">
                      <span className={failure.screenshotPath ? 'available' : ''}>Screenshot</span>
                      <span className={failure.tracePath ? 'available' : ''}>Trace</span>
                      <span className={failure.videoPath ? 'available' : ''}>Video</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {false && <>
      <section className="section split">
        <div>
          <SectionHeader icon={<Bot />} title="AI Routing Strategy" subtitle="Use strong reasoning where quality matters and cheaper models for high-volume transformations." />
          <div className="cardStack">
            {modelRoutes.map((route) => (
              <div className="miniCard" key={route.name}>
                <h3>{route.name}</h3>
                <p>{route.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="codePanel">
          <div className="codeTitle">Contract rule</div>
          <pre>{`OpenAPI = deterministic service contract
MCP = model-facing resources, prompts, tools
Structured Outputs = typed AI handoffs
Playwright PR = governed delivery unit
CI artifacts = evidence and rollback context`}</pre>
        </div>
      </section>

      <section id="playwright" className="section split">
        <div>
          <SectionHeader icon={<Play />} title="Playwright Engineering Standard" subtitle="The app is aligned with the stabilized TypeScript POM framework." />
          <ul className="checkList">
            {standards.map((standard) => (
              <li key={standard}><CheckCircle2 size={18} /> {standard}</li>
            ))}
          </ul>
          <div className="cardStack playwrightFileStack">
            {playwrightFrameworkFiles.map((file) => (
              <div className="miniCard" key={file}>
                <h3>{file}</h3>
                <p>{file.includes('AuthPage') ? 'Registration and login form behavior lives in the page object.' : file.includes('HomePage') ? 'Homepage navigation, popup safety, and header assertions live here.' : file.includes('testData') ? 'Reusable yopmail registration data and random helpers live here.' : 'Part of the reusable Playwright test framework.'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="codePanel accent">
          <div className="codeTitle">Framework commands</div>
          <pre>{`npx playwright test --grep "@homepage"
npx playwright test --grep "@smoke"
npx playwright test --grep "@login"
npx playwright test --grep "@register"

Debug artifacts:
${playwrightDebugArtifacts.join('\n')}`}</pre>
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<Split />} title="Existing Test Decision Rules" subtitle="The model recommends, but deterministic services validate and humans approve risky changes." />
        <div className="decisionGrid">
          {decisions.map((decision) => (
            <div className="decisionCard" key={decision.label}>
              <strong>{decision.label}</strong>
              <p>{decision.rule}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<TestTube2 />} title="GitHub Actions & Ticket Management" subtitle="Connected CI workflow for builds, Jira ticket context, Playwright runs, artifacts, user stories, and bugs." />
        <div className="githubActionsShell">
          <div className="githubHeroPanel">
            <div className="panelTitle">
              <strong>QA Automation Pipeline</strong>
              <span>Active workflow</span>
            </div>
            <p>Runs on push, pull request, or manual workflow dispatch. Manual runs can accept a Jira ticket key and a Playwright tag such as @smoke, @login, @cart, or @checkout.</p>
            <div className="githubCommand">
              <code>.github/workflows/qa-automation.yml</code>
            </div>
            <div className="githubStats">
              <Metric value="3" label="Triggers" />
              <Metric value="2" label="Issue forms" />
              <Metric value="5" label="Core secrets" />
            </div>
          </div>

          <div className="githubWorkflowGrid">
            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>Workflow stages</strong>
                <span>CI gates</span>
              </div>
              <div className="controlGrid">
                {githubWorkflowSteps.map((step) => (
                  <div className="control" key={step}>
                    <CheckCircle2 size={18} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>Manual run inputs</strong>
                <span>GitHub Actions</span>
              </div>
              <div className="codePanel compactCodePanel">
                <div className="codeTitle">Run workflow</div>
                <pre>{`test_tag=@smoke
jira_ticket_key=PROJECT-123

npm run ci:jira-ticket -- --ticket PROJECT-123
npx playwright test --grep "@smoke"`}</pre>
              </div>
            </div>
          </div>

          <div className="githubWorkflowGrid">
            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>GitHub issue templates</strong>
                <span>Management</span>
              </div>
              <div className="cardStack">
                {githubIssueTemplates.map((template) => (
                  <div className="miniCard" key={template.name}>
                    <h3>{template.name}</h3>
                    <p>{template.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>Secrets to configure</strong>
                <span>Repository settings</span>
              </div>
              <div className="secretGrid">
                {githubSecrets.map((secret) => <code key={secret}>{secret}</code>)}
              </div>
              <p>Add them in GitHub under Repository Settings → Secrets and variables → Actions.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="mcp" className="section">
        <SectionHeader icon={<Network />} title="MCP Server Visibility" subtitle="Model Context Protocol connects AI clients to Jira, Playwright, GitHub, reporting, and QA automation tools through safe tool contracts." />
        <div className="mcpShell">
          <div className="mcpHeroPanel">
            <div className="panelTitle">
              <strong>QA MCP Server</strong>
              <span>stdio tool server</span>
            </div>
            <p>MCP results appear inside an MCP-compatible AI client, not directly in the browser. This panel documents what your local MCP server can do and how a QA engineer should use it safely.</p>
            <div className="mcpFlow">
              <span>AI Client</span>
              <strong>↔</strong>
              <span>MCP Server</span>
              <strong>↔</strong>
              <span>Jira / Playwright / GitHub</span>
            </div>
            <div className="githubCommand">
              <code>npm run mcp:server</code>
            </div>
          </div>

          <div className="mcpGrid">
            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>Available MCP tools</strong>
                <span>{mcpTools.length} tools</span>
              </div>
              <div className="mcpToolList">
                {mcpTools.map((tool) => (
                  <div className="mcpToolCard" key={tool.name}>
                    <code>{tool.name}</code>
                    <p>{tool.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>Where to see results</strong>
                <span>MCP client</span>
              </div>
              <div className="assistantBlock">
                <strong>Results appear in</strong>
                <ul>
                  <li>Claude Desktop, Cursor, Windsurf, or another MCP-compatible AI client.</li>
                  <li>The AI chat/tool response after it calls your MCP server.</li>
                  <li>Generated pending scripts appear in generated-tests/pending/.</li>
                </ul>
              </div>
              <div className="assistantBlock">
                <strong>Results do not appear in</strong>
                <ul>
                  <li>The browser dashboard automatically.</li>
                  <li>localhost:8787 API routes.</li>
                  <li>tests/e2e without explicit human approval.</li>
                </ul>
              </div>
              <div className="codePanel compactCodePanel">
                <div className="codeTitle">Example MCP prompt</div>
                <pre>{`Use the QA MCP server to analyze LOCAL-SAMPLE.
Then generate manual test cases and identify Playwright coverage gaps.`}</pre>
              </div>
            </div>
          </div>

          <div className="mcpGrid">
            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>QA scenarios</strong>
                <span>Professional workflow</span>
              </div>
              <div className="controlGrid">
                {mcpScenarios.map((scenario) => (
                  <div className="control" key={scenario}>
                    <CheckCircle2 size={18} />
                    <span>{scenario}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="assistantPanel">
              <div className="panelTitle">
                <strong>Safety guardrails</strong>
                <span>Human approval</span>
              </div>
              <div className="controlGrid">
                {mcpSafetyRules.map((rule) => (
                  <div className="control" key={rule}>
                    <ShieldCheck size={18} />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<ShieldCheck />} title="Connector Operations" subtitle="Each provider has different webhook, auth, retry, and renewal behavior." />
        <div className="cardGrid">
          {connectorRules.map((rule) => (
            <div className="card" key={rule.name}>
              <h3>{rule.name}</h3>
              <p>{rule.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="governance" className="section">
        <SectionHeader icon={<ShieldCheck />} title="Security, Governance, and Auditability" subtitle="Controls for model risk, credentials, traceability, and production safety." />
        <div className="controlGrid">
          {controls.map((control) => (
            <div className="control" key={control}>
              <LockKeyhole size={18} />
              <span>{control}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<Activity />} title="KPIs and Monitoring" subtitle="Measure connector health, AI quality, automation quality, pipeline speed, and debugging value." />
        <div className="controlGrid">
          {kpis.map((kpi) => (
            <div className="control" key={kpi}>
              <CheckCircle2 size={18} />
              <span>{kpi}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<AlertTriangle />} title="Risk Boundaries" subtitle="MCP is for controlled tool access; orchestration, persistence, approvals, and rollout remain in your services." />
        <div className="riskPanel">
          <div>
            <strong>Do not let the model merge code directly.</strong>
            <p>Generated artifacts become plans first. The code service validates, opens a PR, attaches evidence, and requires review for risky changes.</p>
          </div>
          <div>
            <strong>Propagate audit context end-to-end.</strong>
            <p>Track issue key, prompt version, schema version, model, response ID, branch, PR, pipeline run, trace ID, and notification thread.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHeader icon={<Rocket />} title="Implementation Roadmap" subtitle="A realistic path from architecture foundation to production-ready platform." />
        <div className="roadmap">
          {roadmap.map((item) => (
            <div className="roadmapItem" key={item.phase}>
              <div>
                <h3>{item.phase}</h3>
                <p>{item.scope}</p>
              </div>
              <span>{item.time}</span>
            </div>
          ))}
        </div>
      </section>
      </>}

      <footer>
        <MessageSquare size={18} />
        <span>Jira-first QA analysis and Playwright evidence in one workspace.</span>
        <nav aria-label="QA execution reports">
          {Object.entries(pipelineReports)
            .filter(([, report]) => report.exists && report.url)
            .map(([name, report]) => <a key={name} href={report.url} target="_blank" rel="noreferrer">{reportLabel(name)}</a>)}
        </nav>
      </footer>
    </main>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="metaItem">
      <span>{label}</span>
      <strong>{value || 'N/A'}</strong>
    </div>
  );
}

function StructuredText({ value }: { value: string }) {
  const blocks = parseStructuredText(value);

  return (
    <div className="structuredText">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return <h4 key={`${block.text}-${index}`}>{block.text}</h4>;
        }

        if (block.type === 'list') {
          return (
            <ul key={`${block.items.join('-')}-${index}`}>
              {block.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        }

        return <p key={`${block.text}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

function parseStructuredText(value: string) {
  const normalized = value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lines = normalized ? normalized.split('\n') : ['No content available.'];
  const blocks: Array<{ type: 'heading'; text: string } | { type: 'paragraph'; text: string } | { type: 'list'; items: string[] }> = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'list', items: list });
      list = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    if (isStructuredHeading(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: line.replace(/:$/, '') });
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function isStructuredHeading(value: string) {
  if (value.length > 72) return false;
  if (/^[A-Z][A-Za-z/& ]+\s*\([^)]*\)$/.test(value)) return true;
  if (/^[A-Z][A-Za-z/& ]+:$/.test(value)) return true;

  const knownHeadings = [
    'Description',
    'Desktop',
    'Mobile',
    'Footer',
    'Legal/Policy Pages to add',
    'Alignment & Spacing',
    'Acceptance Criteria',
    'Expected Result',
    'Steps to Reproduce',
    'QA Notes',
  ];

  return knownHeadings.some((heading) => value.toLowerCase() === heading.toLowerCase());
}

function findLatestExecution(item: TestInventoryItem, summary: PipelineRunSummary | null) {
  if (!summary) return undefined;

  return summary.results.find((result) => (
    result.title === item.scenario
    || (result.feature === item.feature && result.title.includes(item.scenario))
  ));
}

function coverageGuidance(coverage: string, status: string) {
  if (status === 'pending') {
    return 'Pending generation: review the scenario and move it into the active suite when its implementation is ready.';
  }

  const guidance: Record<string, string> = {
    covered: 'This acceptance criterion has automated assertions connected to the Playwright execution pipeline.',
    partial: 'Useful automated evidence exists, but the remaining behavior still requires the manual validation described by the scenario.',
    missing: 'No reliable automated assertion exists yet. Review the feature steps before promoting this criterion into the active suite.',
  };

  return guidance[coverage] || 'Review the feature scenario and its tags to confirm how this criterion should be validated.';
}

function formatDuration(duration: number) {
  if (duration < 1000) return `${duration} ms`;
  return `${(duration / 1000).toFixed(1)} s`;
}

function reportLabel(name: string) {
  const labels: Record<string, string> = {
    playwrightHtml: 'Playwright HTML',
    playwrightJson: 'Playwright JSON',
    allureReport: 'Allure report',
    markdown: 'Markdown reports',
    excel: 'Excel matrix',
    ndjson: 'Live NDJSON',
    failures: 'Failure triage',
    screenshots: 'Screenshots',
    traces: 'Traces',
    videos: 'Videos',
  };
  return labels[name] || name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleDateString() : 'No date';
}

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString() : 'No date';
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="sectionHeader">
      <div className="sectionIcon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function ArchitectureNode({ icon, title, text, featured = false }: { icon: ReactNode; title: string; text: string; featured?: boolean }) {
  return (
    <div className={featured ? 'archNode featured' : 'archNode'}>
      <div className="nodeIcon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export default App;
