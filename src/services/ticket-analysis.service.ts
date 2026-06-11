import type { CoverageGap, CoverageStatus, JiraTicketSample, ManualTestStrategy, RiskLevel, TicketAnalysisOutput } from '../types/ticket-analysis.types';

export class TicketAnalysisService {
  analyze(ticket: JiraTicketSample, coverage: { recommendedTags: string[]; existingCoverageStatus: CoverageStatus; gaps: CoverageGap[] }): TicketAnalysisOutput {
    return {
      ticket_id: ticket.ticket_id,
      summary: this.createSummary(ticket),
      risk_level: this.resolveRiskLevel(ticket),
      impacted_modules: this.resolveImpactedModules(ticket),
      manual_test_scenarios: this.createManualTestStrategy(ticket),
      recommended_existing_tags: coverage.recommendedTags,
      existing_coverage_status: coverage.existingCoverageStatus,
      missing_coverage: coverage.gaps.filter((gap) => gap.status === 'Missing' || gap.status === 'Partial' || gap.status === 'Manual Only'),
      suggested_playwright_script: '',
      approval_required: true,
    };
  }

  private createSummary(ticket: JiraTicketSample) {
    return `${ticket.ticket_id}: ${ticket.title}. QA should validate ${ticket.component} on ${ticket.environment} for ${ticket.assigned_to}.`;
  }

  private resolveRiskLevel(ticket: JiraTicketSample): RiskLevel {
    const text = `${ticket.priority} ${ticket.component} ${ticket.description}`.toLowerCase();

    if (text.includes('payment') || text.includes('checkout') || text.includes('critical')) return 'Critical';
    if (text.includes('high') || text.includes('cart') || text.includes('bag') || text.includes('login')) return 'High';
    if (text.includes('search') || text.includes('product')) return 'Medium';
    return 'Low';
  }

  private resolveImpactedModules(ticket: JiraTicketSample) {
    return ticket.component.split(',').map((item) => item.trim()).filter(Boolean);
  }

  private createManualTestStrategy(ticket: JiraTicketSample): ManualTestStrategy {
    return {
      positive_scenarios: ticket.acceptance_criteria.map((criterion) => `Verify that ${criterion.charAt(0).toLowerCase()}${criterion.slice(1)}.`),
      negative_scenarios: [
        'Verify validation and user messaging when required fields or selections are missing.',
        'Verify that unavailable product options cannot be added to bag.',
        'Verify graceful behavior when search returns no relevant products.',
      ],
      edge_cases: [
        'Test with short, long, mixed-case, and special-character search terms.',
        'Test repeated add-to-bag attempts and confirm quantity or basket state remains correct.',
        'Refresh after adding to bag and confirm basket state is preserved where expected.',
      ],
      regression_impact: [
        `Re-test existing flows touching ${ticket.component}.`,
        'Run smoke and regression automation tags related to impacted modules.',
        'Check that existing login, search, cart, and checkout journeys are not broken.',
      ],
      ui_checks: [
        'Verify labels, validation messages, loading states, buttons, icons, and basket count are visible and readable.',
        'Verify no unexpected marketing popup blocks the core QA flow.',
      ],
      api_data_checks: [
        'Verify product data, price, size availability, and basket payload remain consistent after UI actions.',
        'Check browser network failures do not leave the UI in a misleading success state.',
      ],
      mobile_responsive_checks: [
        'Verify the flow on mobile viewport using header search, product selection, and bag interactions.',
        'Verify sticky headers, drawers, and modals remain usable on small screens.',
      ],
      accessibility_checks: [
        'Verify keyboard focus reaches search, product options, add-to-bag, and basket controls.',
        'Verify visible validation messages are announced or associated with the relevant fields where applicable.',
      ],
    };
  }
}
