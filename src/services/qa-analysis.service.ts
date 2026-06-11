import { TestCaseGeneratorService } from './test-case-generator.service';
import type { AssistantCoverageGap, JiraAssistantTicket, QaAssistantAnalysis } from '../types/qa-assistant.types';

export class QaAnalysisService {
  constructor(private readonly testCaseGenerator = new TestCaseGeneratorService()) {}

  analyze(ticket: JiraAssistantTicket, coverage: AssistantCoverageGap[], scriptPath = ''): QaAssistantAnalysis {
    const risk = this.resolveRisk(ticket);
    const manualTestCases = this.testCaseGenerator.generate(ticket);
    const commentInsights = this.extractCommentInsights(ticket);

    return {
      ticket_key: ticket.key,
      title: ticket.title,
      issue_type: ticket.issueType,
      business_summary: `${ticket.title} impacts ${ticket.components.join(', ') || 'the product experience'}.`,
      qa_summary: `Validate ${ticket.issueType || 'ticket'} ${ticket.key} on ${ticket.environment} for ${ticket.assignee}.`,
      risk_level: risk.level,
      risk_score: risk.score,
      impacted_modules: ticket.components.length ? ticket.components : ['General UI'],
      assumptions: ['Mock AI mode is active for natural-language reasoning.', 'Acceptance criteria are extracted from Jira description or local JSON.'],
      dependencies: ['Jira ticket quality', 'Stable test environment', 'Existing Playwright page objects'],
      comment_insights: commentInsights,
      test_environment: ticket.environment,
      how_to_test: {
        what_is_changing: ticket.description || ticket.title,
        why_it_matters: 'The change can affect customer journey quality, conversion, and regression stability.',
        preconditions: [`${ticket.environment} is reachable`, 'Required QA user/test data is available', 'Known popups can be safely dismissed', ...commentInsights.filter((item) => /env|environment|setup|precondition/i.test(item))],
        test_data_needed: ['QA customer account if needed', 'Product/search/cart data relevant to the ticket', 'Mobile and desktop viewport coverage', ...commentInsights.filter((item) => /data|user|account|product|sku|order/i.test(item))],
        test_environment: ticket.environment,
        step_by_step: ticket.acceptanceCriteria.map((criterion, index) => `${index + 1}. Validate: ${criterion}`),
        positive_scenarios: ticket.acceptanceCriteria.map((criterion) => `Confirm expected behavior: ${criterion}`),
        negative_scenarios: ['Validate missing/invalid input handling.', 'Validate unavailable or empty-state behavior.', 'Validate no false success message appears.'],
        edge_cases: ['Repeat the flow twice.', 'Refresh during/after the flow.', 'Use boundary input values where applicable.'],
        regression_areas: ticket.components.length ? ticket.components : ['Smoke flow', 'UI shell', 'Data persistence'],
        ui_checks: ['Labels, buttons, modals, validation messages, loading states, and icons are visible and clear.'],
        api_data_checks: ['UI state should match product/order/customer data returned by network calls where applicable.'],
        mobile_responsive_checks: ['Repeat core checks on mobile viewport and verify navigation/drawers remain usable.'],
        accessibility_checks: ['Keyboard focus order is logical and visible messages are readable/announced where relevant.'],
        risks_and_watchouts: ['Cloudflare/captcha cannot be automated.', 'Third-party payment or destructive operations may require manual-only handling.', ...commentInsights.filter((item) => /risk|block|issue|bug|known|watch|careful/i.test(item))],
      },
      manual_test_cases: manualTestCases,
      regression_impact: ticket.components.map((component) => `Regression risk in ${component}`),
      automation_recommendation: coverage.some((gap) => gap.coverage_status === 'Missing') ? 'Create or approve suggested Playwright coverage.' : 'Patch or reuse existing tagged coverage where possible.',
      existing_coverage: coverage,
      missing_coverage: coverage.filter((gap) => gap.coverage_status !== 'Covered'),
      suggested_playwright_script: {
        suggested_file_path: scriptPath,
        module: this.resolveModule(ticket),
        tags: this.recommendTags(ticket),
        risk_level: risk.level,
        generated_code: '',
        requires_human_review: true,
        assumptions: ['Generated script must be reviewed against real selectors before approval.'],
      },
      approval_required: true,
    };
  }

  recommendTags(ticket: JiraAssistantTicket) {
    const text = `${ticket.title} ${ticket.description} ${ticket.comments.map((comment) => comment.body).join(' ')} ${ticket.components.join(' ')}`.toLowerCase();
    const tags = new Set(['@regression', '@ui']);
    if (/search/.test(text)) tags.add('@search');
    if (/cart|bag|basket/.test(text)) tags.add('@cart');
    if (/checkout/.test(text)) tags.add('@checkout');
    if (/payment/.test(text)) tags.add('@payment');
    if (/login|account|auth/.test(text)) tags.add('@login');
    if (/register|registration/.test(text)) tags.add('@register');
    if (ticket.priority.toLowerCase() === 'high' || ticket.priority.toLowerCase() === 'critical') tags.add('@smoke');
    return [...tags];
  }

  private resolveRisk(ticket: JiraAssistantTicket) {
    const text = `${ticket.priority} ${ticket.title} ${ticket.comments.map((comment) => comment.body).join(' ')} ${ticket.components.join(' ')}`.toLowerCase();
    if (/payment|checkout|critical/.test(text)) return { level: 'Critical' as const, score: 95 };
    if (/high|cart|bag|login/.test(text)) return { level: 'High' as const, score: 80 };
    if (/search|product/.test(text)) return { level: 'Medium' as const, score: 55 };
    return { level: 'Low' as const, score: 25 };
  }

  private resolveModule(ticket: JiraAssistantTicket) {
    const tags = this.recommendTags(ticket);
    if (tags.includes('@checkout') || tags.includes('@payment')) return 'checkout';
    if (tags.includes('@cart')) return 'cart';
    if (tags.includes('@search')) return 'search';
    if (tags.includes('@login') || tags.includes('@register')) return 'auth';
    return 'smoke';
  }

  private extractCommentInsights(ticket: JiraAssistantTicket) {
    const insights = ticket.comments
      .map((comment) => `${comment.author}: ${comment.body}`)
      .filter((comment) => /qa|test|verify|risk|block|env|data|scope|fix|release|regression|automation|playwright/i.test(comment))
      .slice(0, 6);

    return insights.length ? insights : ['No actionable Jira comments found. Use ticket description and acceptance criteria as the main QA source.'];
  }
}
