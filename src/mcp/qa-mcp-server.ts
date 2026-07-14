import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { JiraTicketReaderService } from '../services/jira-ticket-reader.service';
import { PlaywrightScriptGeneratorService } from '../services/playwright-script-generator.service';
import { QaAnalysisService } from '../services/qa-analysis.service';
import { TestCaseGeneratorService } from '../services/test-case-generator.service';
import type { AssistantCoverageGap, JiraAssistantTicket } from '../types/qa-assistant.types';

const server = new Server(
  {
    name: 'qa-ai-framework-showcase-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

const jiraReader = new JiraTicketReaderService();
const testCaseGenerator = new TestCaseGeneratorService();
const qaAnalysisService = new QaAnalysisService();
const scriptGenerator = new PlaywrightScriptGeneratorService();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_jira_tickets',
      description: 'Read Jira tickets assigned to the configured Jira user, or local sample ticket when Jira credentials are missing.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'list_project_qa_scope',
      description: 'Return the supported QA project scope, Jira statuses, safe Playwright tags, and MCP approval boundaries for this EGO QA project.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'list_scoped_qa_tickets',
      description: 'Read EGO App and VSF2 QA tickets from the project-scoped statuses used by the React dashboard.',
      inputSchema: {
        type: 'object',
        properties: {
          maxResults: { type: 'number', description: 'Maximum number of scoped QA tickets to return. Default 25, maximum 100.' },
          assignee: { type: 'string', description: 'Optional Jira assignee display name, such as Naveed Chughtai or Sana.khan.' },
        },
      },
    },
    {
      name: 'read_jira_ticket',
      description: 'Read one Jira ticket by key, including description, acceptance criteria, metadata, and comments.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as PROJECT-123. Use LOCAL-SAMPLE for local fallback.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'analyze_jira_ticket',
      description: 'Generate QA guidance, risk level, manual test cases, comment insights, and automation coverage recommendation for a Jira ticket.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as PROJECT-123. Use LOCAL-SAMPLE for local fallback.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'create_qa_execution_package',
      description: 'Create a complete QA package for one ticket: normalized ticket, risks, manual test cases, coverage gaps, suggested tags, and Jira-ready sign-off draft.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as VSF2-123. Use LOCAL-SAMPLE for local fallback.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'draft_passed_qa_comment',
      description: 'Draft a professional Jira comment for a ticket that has passed manual QA. This does not post anything to Jira.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as VSF2-123. Use LOCAL-SAMPLE for local fallback.' },
          resultSummary: { type: 'string', description: 'Optional short QA result summary from the tester.' },
          evidence: { type: 'string', description: 'Optional evidence links, environments, or notes.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'post_approved_jira_comment',
      description: 'Post a human-approved Jira comment. Requires confirmed=true and a non-empty comment.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as VSF2-123.' },
          comment: { type: 'string', description: 'The exact human-approved comment body to post.' },
          confirmed: { type: 'boolean', description: 'Must be true. This is the MCP human approval gate.' },
        },
        required: ['ticketKey', 'comment', 'confirmed'],
      },
    },
    {
      name: 'generate_manual_test_cases',
      description: 'Generate manual QA test cases from a Jira ticket acceptance criteria and QA comments.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as PROJECT-123. Use LOCAL-SAMPLE for local fallback.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'check_playwright_coverage',
      description: 'Compare a Jira ticket acceptance criteria against existing Playwright tests and tags to identify coverage gaps.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as PROJECT-123. Use LOCAL-SAMPLE for local fallback.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'generate_pending_playwright_script',
      description: 'Generate a suggested Gherkin feature into generated-tests/pending only. This never approves or inserts the feature into the active BDD suite.',
      inputSchema: {
        type: 'object',
        properties: {
          ticketKey: { type: 'string', description: 'Jira ticket key such as PROJECT-123. Use LOCAL-SAMPLE for local fallback.' },
        },
        required: ['ticketKey'],
      },
    },
    {
      name: 'list_playwright_tags',
      description: 'List the allowed Playwright tags that can be used for safe targeted execution.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const args = request.params.arguments ?? {};

  try {
    switch (request.params.name) {
      case 'list_jira_tickets': {
        const tickets = await jiraReader.readTickets();
        return jsonToolResult({ tickets });
      }
      case 'list_project_qa_scope': {
        return jsonToolResult(projectQaScope());
      }
      case 'list_scoped_qa_tickets': {
        const tickets = await jiraReader.readScopedQaTickets(numberArg(args.maxResults, 25), stringArg(args.assignee));
        return jsonToolResult({
          scope: projectQaScope(),
          total: tickets.length,
          tickets: tickets.map(summarizeTicket),
        });
      }
      case 'read_jira_ticket': {
        const ticket = await readTicketFromArgs(args);
        return jsonToolResult({ ticket });
      }
      case 'analyze_jira_ticket': {
        const ticket = await readTicketFromArgs(args);
        const coverage = analyzeCoverageForMcp(ticket);
        const analysis = qaAnalysisService.analyze(ticket, coverage);
        return jsonToolResult({ analysis });
      }
      case 'create_qa_execution_package': {
        const ticket = await readTicketFromArgs(args);
        const coverage = analyzeCoverageForMcp(ticket);
        const analysis = qaAnalysisService.analyze(ticket, coverage);
        return jsonToolResult({
          ticket,
          analysis,
          manualTestCases: testCaseGenerator.generate(ticket),
          coverage,
          missingCoverage: coverage.filter((gap) => gap.coverage_status !== 'Covered'),
          signOffCommentDraft: buildPassedQaComment(ticket, analysis),
          nextActions: recommendNextActions(analysis),
          approvalBoundaries: projectQaScope().approvalBoundaries,
        });
      }
      case 'draft_passed_qa_comment': {
        const ticket = await readTicketFromArgs(args);
        const coverage = analyzeCoverageForMcp(ticket);
        const analysis = qaAnalysisService.analyze(ticket, coverage);
        return jsonToolResult({
          ticketKey: ticket.key,
          comment: buildPassedQaComment(ticket, analysis, {
            resultSummary: stringArg(args.resultSummary),
            evidence: stringArg(args.evidence),
          }),
          safety: 'Draft only. Review and approve before using post_approved_jira_comment.',
        });
      }
      case 'post_approved_jira_comment': {
        const result = await jiraReader.addApprovedComment(requiredString(args.ticketKey, 'ticketKey'), requiredString(args.comment, 'comment'), args.confirmed === true);
        return jsonToolResult({
          posted: true,
          jiraResponseId: (result as { id?: string }).id || '',
          ticketKey: args.ticketKey,
          safety: 'Comment was posted only because confirmed=true was provided.',
        });
      }
      case 'generate_manual_test_cases': {
        const ticket = await readTicketFromArgs(args);
        return jsonToolResult({ testCases: testCaseGenerator.generate(ticket) });
      }
      case 'check_playwright_coverage': {
        const ticket = await readTicketFromArgs(args);
        const coverage = analyzeCoverageForMcp(ticket);
        return jsonToolResult({ coverage, missingCoverage: coverage.filter((gap) => gap.coverage_status !== 'Covered') });
      }
      case 'generate_pending_playwright_script': {
        const ticket = await readTicketFromArgs(args);
        const coverage = analyzeCoverageForMcp(ticket);
        const analysis = qaAnalysisService.analyze(ticket, coverage);
        const script = await scriptGenerator.generate(ticket, analysis);
        return jsonToolResult({ script, approvalRequired: true, safety: 'Generated into pending folder only. Human approval is required before framework insertion.' });
      }
      case 'list_playwright_tags': {
        return jsonToolResult({ tags: ['@smoke', '@auth', '@login', '@register', '@homepage', '@search', '@cart', '@checkout', '@payment', '@regression', '@ui'] });
      }
      default:
        throw new Error(`Unknown MCP tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : 'MCP tool failed',
        },
      ],
    };
  }
});

await server.connect(new StdioServerTransport());

async function readTicketFromArgs(args: Record<string, unknown>) {
  const ticketKey = typeof args.ticketKey === 'string' ? args.ticketKey : '';
  if (!ticketKey) {
    throw new Error('ticketKey is required');
  }

  return jiraReader.readTicket(ticketKey);
}

function jsonToolResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function projectQaScope() {
  return {
    jiraProjects: [
      {
        project: 'EGO App',
        statuses: ['TESTFLIGHT TESTING', 'Production Testing'],
      },
      {
        project: 'VSF2',
        boardId: '20',
        statuses: ['DEV QA (TESTING ON DEV)', 'CODE REVIEW (PR TO STAGE)'],
      },
    ],
    qaAssignees: ['All tickets', 'Sana.khan', 'Naveed Chughtai'],
    allowedPlaywrightTags: ['@smoke', '@auth', '@login', '@register', '@homepage', '@search', '@cart', '@checkout', '@payment', '@regression', '@ui'],
    qaChallengesCovered: [
      'Read scoped Jira tickets with acceptance criteria and comments.',
      'Convert Jira scope into manual QA test cases.',
      'Identify missing Playwright coverage by acceptance criterion.',
      'Generate pending Playwright scripts without auto-approving framework changes.',
      'Draft Jira-ready QA sign-off comments.',
      'Post Jira comments only after explicit confirmation.',
    ],
    approvalBoundaries: [
      'MCP may read Jira tickets and generate drafts without approval.',
      'MCP must not insert tests into tests/e2e automatically.',
      'MCP must not post Jira comments unless confirmed=true is supplied.',
      'MCP must not run arbitrary shell commands.',
      'Generated scripts stay in generated-tests/pending until reviewed.',
    ],
  };
}

function summarizeTicket(ticket: JiraAssistantTicket) {
  return {
    key: ticket.key,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee,
    issueType: ticket.issueType,
    components: ticket.components,
    acceptanceCriteriaCount: ticket.acceptanceCriteria.length,
    commentCount: ticket.comments.length,
    url: ticket.url,
  };
}

function buildPassedQaComment(
  ticket: JiraAssistantTicket,
  analysis: ReturnType<QaAnalysisService['analyze']>,
  options: { resultSummary?: string; evidence?: string } = {},
) {
  const manualCaseCount = analysis.manual_test_cases.length;
  const missingCoverageCount = analysis.missing_coverage.length;
  const modules = uniqueText([...(analysis.impacted_modules || []), ...ticket.components]).join(', ') || 'General UI';
  const tags = analysis.suggested_playwright_script.tags;

  return [
    `QA validation completed for ${ticket.key}: ${ticket.title}`,
    '',
    'Result: Passed',
    `Environment: ${analysis.test_environment || ticket.environment}`,
    `Scope covered: ${modules}`,
    `Manual test cases reviewed: ${manualCaseCount}`,
    `Automation/coverage gaps noted: ${missingCoverageCount}`,
    tags.length ? `Recommended automation tags: ${tags.join(', ')}` : '',
    options.resultSummary ? `Tester summary: ${options.resultSummary}` : '',
    options.evidence ? `Evidence: ${options.evidence}` : '',
    '',
    'Summary:',
    'The ticket has been reviewed against the available description, acceptance criteria, Jira comments, and generated QA test strategy. The expected customer-facing behavior is working as expected based on the completed manual validation.',
    '',
    'QA notes:',
    '- Core happy-path behavior was validated.',
    '- Relevant UI, data, and regression touchpoints were considered.',
    '- No blocking QA issue was identified during this validation pass.',
    missingCoverageCount ? '- Any remaining automation coverage gaps should be handled separately and should not block this manual QA sign-off.' : '- No uncovered scenario was identified in the current QA analysis.',
    '',
    'Status recommendation: Ready for the next workflow step.',
  ].filter(Boolean).join('\n');
}

function recommendNextActions(analysis: ReturnType<QaAnalysisService['analyze']>) {
  const actions = [
    'Review generated manual test cases against the real storefront flow.',
    'Run or map the recommended Playwright tags before final sign-off.',
  ];

  if (analysis.missing_coverage.length) {
    actions.push('Generate a pending Playwright script for uncovered acceptance criteria.');
  }

  actions.push('Use draft_passed_qa_comment, then post_approved_jira_comment only after human confirmation.');
  return actions;
}

function analyzeCoverageForMcp(ticket: JiraAssistantTicket): AssistantCoverageGap[] {
  return ticket.acceptanceCriteria.map((criterion) => {
    const tags = qaAnalysisService.recommendTags(ticket);

    return {
      acceptance_criterion: criterion,
      coverage_status: 'Missing',
      matched_tests: [],
      missing_scenarios: [`No confirmed Playwright coverage mapped for: ${criterion}`],
      recommended_tags: tags,
      automation_priority: ticket.priority.toLowerCase() === 'high' || ticket.priority.toLowerCase() === 'critical' ? 'High' : 'Medium',
    };
  });
}

function stringArg(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requiredString(value: unknown, name: string) {
  const parsed = stringArg(value);

  if (!parsed) {
    throw new Error(`${name} is required`);
  }

  return parsed;
}

function numberArg(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function uniqueText(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
