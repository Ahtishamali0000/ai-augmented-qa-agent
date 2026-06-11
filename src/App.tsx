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
  Network,
  PlugZap,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Split,
  TestTube2,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

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

type PlaywrightReportSummary = {
  exists: boolean;
  reportPath: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: PlaywrightFailure[];
  suggestions: string[];
};

type PlaywrightFailure = {
  title: string;
  file: string;
  status: string;
  duration: number;
  reason: string;
  message: string;
  suggestion: string[];
};

type PlaywrightRunResponse = {
  grep: string;
  exitCode: number;
  passed: boolean;
  startedAt: string;
  finishedAt: string;
  stdout: string;
  stderr: string;
  mode: string;
  workers: number;
  error?: string;
  report: PlaywrightReportSummary;
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

const playwrightTags = ['@homepage', '@smoke', '@login', '@register', '@auth', '@regression', '@ui'];
const playwrightSuites = [
  {
    tag: '@homepage',
    title: 'Homepage Smoke',
    command: 'npx playwright test --grep "@homepage"',
    coverage: 'HomePage.goto, popup safety, header logo, search, account, wishlist, bag, country selector',
  },
  {
    tag: '@login',
    title: 'Login Automation',
    command: 'npx playwright test --grep "@login"',
    coverage: 'AuthPage login form, environment credentials, submitted-login verification',
  },
  {
    tag: '@register',
    title: 'Registration Automation',
    command: 'npx playwright test --grep "@register"',
    coverage: 'Random yopmail data, email-first signup support, registration form fill, debug screenshots',
  },
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
  const [selectedPlaywrightTag, setSelectedPlaywrightTag] = useState('@smoke');
  const [playwrightHeaded, setPlaywrightHeaded] = useState(false);
  const [playwrightWorkers, setPlaywrightWorkers] = useState(2);
  const [playwrightResult, setPlaywrightResult] = useState<PlaywrightRunResponse | null>(null);
  const [playwrightError, setPlaywrightError] = useState('');
  const [isRunningPlaywright, setIsRunningPlaywright] = useState(false);
  const [assistantTickets, setAssistantTickets] = useState<AssistantTicket[]>([]);
  const [selectedAssistantTicket, setSelectedAssistantTicket] = useState<AssistantTicket | null>(null);
  const [assistantAnalysis, setAssistantAnalysis] = useState<QaAssistantAnalysis | null>(null);
  const [scriptSuggestion, setScriptSuggestion] = useState<ScriptSuggestion | null>(null);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [assistantError, setAssistantError] = useState('');
  const [isAssistantBusy, setIsAssistantBusy] = useState(false);
  const [selectedQaAssignee, setSelectedQaAssignee] = useState('All tickets');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const savedTheme = localStorage.getItem('qa-ai-theme');
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('qa-ai-theme', theme);
  }, [theme]);

  const filteredAssistantTickets = useMemo(() => {
    if (selectedQaAssignee === 'All tickets') {
      return assistantTickets;
    }

    const selected = selectedQaAssignee.toLowerCase();
    return assistantTickets.filter((ticket) => ticket.assignee.toLowerCase().includes(selected));
  }, [assistantTickets, selectedQaAssignee]);

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

  async function runPlaywrightTag() {
    setIsRunningPlaywright(true);
    setPlaywrightError('');
    setPlaywrightResult(null);

    try {
      const response = await fetch('/api/playwright/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grep: selectedPlaywrightTag, headed: playwrightHeaded, workers: playwrightWorkers }),
      });
      const data = await response.json();

      setPlaywrightResult(data as PlaywrightRunResponse);
      if (!response.ok) {
        setPlaywrightError(data.error || 'Playwright run failed');
      }
    } catch (error) {
      setPlaywrightError(error instanceof Error ? error.message : 'Playwright run failed');
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
        body: JSON.stringify({ ticketKey: ticket.key }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze ticket');
      }

      setAssistantAnalysis(data.analysis);
      setScriptSuggestion(null);
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
        body: JSON.stringify({ ticketKey: selectedAssistantTicket.key }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Playwright script');
      }

      setScriptSuggestion(data.script);
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

  return (
    <main>
      <section className="hero">
        <nav className="nav">
          <div className="brand">
            <div className="brandIcon"><Bot size={22} /></div>
            <span>QA AI Framework</span>
          </div>
          <div className="navLinks">
            <a href="#jira-assistant">Jira</a>
            <a href="#architecture">Architecture</a>
            <a href="#workflow">Workflow</a>
            <a href="#playwright">Playwright</a>
            <a href="#governance">Governance</a>
          </div>
          <div className="themeToggle" aria-label="Theme selector">
            <button className={theme === 'dark' ? 'active' : ''} type="button" onClick={() => setTheme('dark')}>Dark</button>
            <button className={theme === 'light' ? 'active' : ''} type="button" onClick={() => setTheme('light')}>Light</button>
          </div>
        </nav>

        <div className="heroGrid">
          <div>
            <div className="eyebrow"><Sparkles size={16} /> AI-driven QA automation platform</div>
            <h1>From Jira ticket to governed Playwright automation.</h1>
            <p className="heroText">
              A dual-interface QA platform that uses OpenAPI as the deterministic service
              contract and MCP as the model-facing contract for curated resources, prompts,
              and tools that convert tickets into test intelligence.
            </p>
            <div className="ctaRow">
              <a className="primaryBtn" href="#workflow">Explore workflow</a>
              <a className="secondaryBtn" href="#architecture">View architecture</a>
            </div>
          </div>

          <div className="heroCard">
            <div className="statusHeader">
              <span>Live QA orchestration preview</span>
              <span className="statusDot">Ready</span>
            </div>
            <div className="metricGrid">
              <Metric value="2" label="OpenAPI + MCP interfaces" />
              <Metric value="6" label="Structured artifacts" />
              <Metric value="5" label="Automation decisions" />
              <Metric value="8" label="Operational KPIs" />
            </div>
            <div className="heroPipeline">
              <span>Ticket-first</span>
              <span>Site-first</span>
              <span>Human-approved</span>
            </div>
          </div>
        </div>
      </section>

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
                      }}
                    >
                      <div className="ticketHeader">
                        <strong>{ticket.key}</strong>
                        <span>{ticket.status}</span>
                      </div>
                      <p>{ticket.title}</p>
                      <div className="ticketMeta">
                        <span>{ticket.priority}</span>
                        <span>{ticket.assignee}</span>
                        <span>{ticket.updated ? new Date(ticket.updated).toLocaleDateString() : 'No date'}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div className="assistantMain">
              <div className="assistantPanel ticketDetailPanel">
                {selectedAssistantTicket ? (
                  <>
                    <div className="panelTitle">
                      <strong>{selectedAssistantTicket.key}: {selectedAssistantTicket.title}</strong>
                      <span>{selectedAssistantTicket.issueType}</span>
                    </div>
                    <p>{selectedAssistantTicket.description}</p>
                    <div className="jiraFilters">
                      <span>{selectedAssistantTicket.priority}</span>
                      <span>{selectedAssistantTicket.environment}</span>
                      <span>Reporter: {selectedAssistantTicket.reporter || 'N/A'}</span>
                      <span>{selectedAssistantTicket.comments.length} comment(s)</span>
                      {selectedAssistantTicket.components.map((component) => <span key={component}>{component}</span>)}
                    </div>
                    <div className="commentList">
                      <div className="panelTitle">
                        <strong>Jira Comments</strong>
                        <span>Used as QA context</span>
                      </div>
                      {selectedAssistantTicket.comments.length === 0 ? (
                        <p>No Jira comments found for this ticket.</p>
                      ) : (
                        selectedAssistantTicket.comments.slice(0, 5).map((comment) => (
                          <div className="commentCard" key={comment.id}>
                            <strong>{comment.author}</strong>
                            <p>{comment.body}</p>
                            <span>{comment.updated ? new Date(comment.updated).toLocaleString() : 'No date'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="emptyState">Select a Jira ticket to see details, analysis, coverage, and script generation.</div>
                )}
              </div>

              {assistantAnalysis && (
                <>
                  <div className="assistantStats">
                    <Metric value={assistantAnalysis.risk_level} label="Risk level" />
                    <Metric value={String(assistantAnalysis.risk_score)} label="Risk score" />
                    <Metric value={String(assistantAnalysis.manual_test_cases.length)} label="Manual cases" />
                    <Metric value={String(assistantAnalysis.missing_coverage.length)} label="Coverage gaps" />
                  </div>

                  <div className="assistantGrid">
                    <div className="assistantPanel">
                      <div className="panelTitle">
                        <strong>How to Test This Ticket</strong>
                        <span>{assistantAnalysis.test_environment}</span>
                      </div>
                      <p>{assistantAnalysis.qa_summary}</p>
                      <div className="assistantBlock">
                        <strong>Jira comment insights</strong>
                        <ul>{assistantAnalysis.comment_insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
                      </div>
                      {Object.entries(assistantAnalysis.how_to_test).map(([key, value]) => (
                        <div className="assistantBlock" key={key}>
                          <strong>{key.replace(/_/g, ' ')}</strong>
                          {Array.isArray(value) ? <ul>{value.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{value}</p>}
                        </div>
                      ))}
                    </div>

                    <div className="assistantPanel">
                      <div className="panelTitle">
                        <strong>Manual Test Cases</strong>
                        <span>Structured QA cases</span>
                      </div>
                      {assistantAnalysis.manual_test_cases.map((testCase) => (
                        <div className="miniCard" key={testCase.id}>
                          <h3>{testCase.id}: {testCase.title}</h3>
                          <p>{testCase.type} / {testCase.priority}</p>
                          <ul>{testCase.steps.map((step) => <li key={step}>{step}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="assistantPanel">
                    <div className="panelTitle">
                      <strong>Existing Playwright Coverage</strong>
                      <span>{assistantAnalysis.automation_recommendation}</span>
                    </div>
                    <div className="coverageGrid">
                      {assistantAnalysis.existing_coverage.map((gap) => (
                        <div className="miniCard" key={gap.acceptance_criterion}>
                          <h3>{gap.coverage_status}: {gap.acceptance_criterion}</h3>
                          <p>Tags: {gap.recommended_tags.join(', ')}</p>
                          <p>Priority: {gap.automation_priority}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {scriptSuggestion && (
                <div className="assistantPanel scriptPreview">
                  <div className="panelTitle">
                    <strong>Playwright Script Suggestion</strong>
                    <span>Approval required</span>
                  </div>
                  <div className="jiraFilters">
                    <span>{scriptSuggestion.suggested_file_path}</span>
                    <span>Module: {scriptSuggestion.module}</span>
                    <span>{scriptSuggestion.tags.join(' ')}</span>
                  </div>
                  <pre>{scriptSuggestion.generated_code}</pre>
                  <button className="primaryBtn" type="button" onClick={approveAssistantScript} disabled={isAssistantBusy}>
                    Approve and Add to Playwright Framework
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section split">
        <div>
          <SectionHeader icon={<Play />} title="Live Playwright Runner" subtitle="Run the stabilized POM-based homepage, login, and registration suites by tag." />
          <div className="jiraPanel">
            <div className="jiraFilters">
              <span>Target: CF staging</span>
              <span>Browser: Chromium</span>
              <span>POM: HomePage + AuthPage</span>
              <span>{playwrightHeaded ? 'Headed browser' : 'Headless browser'}</span>
              <span>{playwrightWorkers} worker(s)</span>
              <span>Report: reports/playwright/results.json</span>
            </div>
            <div className="runnerControls">
              <select value={selectedPlaywrightTag} onChange={(event) => setSelectedPlaywrightTag(event.target.value)}>
                {playwrightTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <select value={playwrightWorkers} onChange={(event) => setPlaywrightWorkers(Number(event.target.value))}>
                <option value={1}>1 worker</option>
                <option value={2}>2 workers</option>
                <option value={3}>3 workers</option>
                <option value={4}>4 workers</option>
              </select>
              <label className="toggleControl">
                <input type="checkbox" checked={playwrightHeaded} onChange={(event) => setPlaywrightHeaded(event.target.checked)} />
                <span>Open browser</span>
              </label>
              <button className="primaryBtn" type="button" onClick={runPlaywrightTag} disabled={isRunningPlaywright}>
                {isRunningPlaywright ? 'Running Playwright...' : `Run ${selectedPlaywrightTag}`}
              </button>
            </div>
            {playwrightResult && (
              <div className="playwrightReport">
                <p className={playwrightResult.passed ? 'successText' : 'errorText'}>
                  Playwright finished with exit code {playwrightResult.exitCode}. Mode: {playwrightResult.mode}. Workers: {playwrightResult.workers}. Total: {playwrightResult.report.total}, Passed: {playwrightResult.report.passed}, Failed: {playwrightResult.report.failed}, Skipped: {playwrightResult.report.skipped}.
                </p>
                <div className="assistantStats">
                  <Metric value={String(playwrightResult.report.total)} label="Total tests" />
                  <Metric value={String(playwrightResult.report.passed)} label="Passed" />
                  <Metric value={String(playwrightResult.report.failed)} label="Failed" />
                  <Metric value={String(playwrightResult.report.skipped)} label="Skipped" />
                </div>
                {playwrightResult.report.failures?.length > 0 && (
                  <div className="assistantPanel">
                    <div className="panelTitle">
                      <strong>Failure Reason</strong>
                      <span>{playwrightResult.report.failures.length} issue(s)</span>
                    </div>
                    <div className="cardStack">
                      {playwrightResult.report.failures.map((failure) => (
                        <div className="miniCard" key={`${failure.title}-${failure.file}`}>
                          <h3>{failure.reason}</h3>
                          <p>{failure.title}</p>
                          {failure.file && <p>{failure.file}</p>}
                          <pre className="failureSnippet">{failure.message}</pre>
                          <div className="assistantBlock">
                            <strong>Suggested fix</strong>
                            <ul>{failure.suggestion.map((item) => <li key={item}>{item}</li>)}</ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {playwrightResult.report.suggestions?.length > 0 && (
                  <div className="assistantPanel">
                    <div className="panelTitle">
                      <strong>Recommended Next Steps</strong>
                      <span>AI-ready summary</span>
                    </div>
                    <ul className="checkList">
                      {playwrightResult.report.suggestions.map((suggestion) => (
                        <li key={suggestion}><CheckCircle2 size={18} /> {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {playwrightError && <p className="errorText">{playwrightError}</p>}
            <div className="cardStack">
              {playwrightSuites.map((suite) => (
                <div className="miniCard" key={suite.tag}>
                  <h3>{suite.title}</h3>
                  <p>{suite.coverage}</p>
                  <div className="jiraFilters">
                    <span>{suite.tag}</span>
                    <span>{suite.command}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="codePanel">
          <div className="codeTitle">AI execution command</div>
          <pre>{`npx playwright test --grep "${selectedPlaywrightTag}" --workers ${playwrightWorkers}${playwrightHeaded ? ' --headed' : ''}

JSON report:
reports/playwright/results.json

HTML report:
reports/playwright/html

Registration debug:
reports/after-signup-click.png
reports/registration-after-email.png
reports/registration-before-submit.png`}</pre>
        </div>
      </section>

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

      <footer>
        <MessageSquare size={18} />
        Built to demonstrate a Jira-first, OpenAI-first, MCP-enabled, Playwright-governed QA automation framework.
      </footer>
    </main>
  );
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
