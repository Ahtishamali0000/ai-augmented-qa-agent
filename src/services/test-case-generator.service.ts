import type { JiraAssistantTicket, ManualTestCase } from '../types/qa-assistant.types';

export class TestCaseGeneratorService {
  generate(ticket: JiraAssistantTicket): ManualTestCase[] {
    const baseTags = ticket.components.map((component) => component.toLowerCase().replace(/\s+/g, '-'));

    return [
      ...ticket.acceptanceCriteria.map((criterion, index) => ({
        id: `${ticket.key}-TC-${String(index + 1).padStart(3, '0')}`,
        title: criterion,
        priority: ticket.priority,
        type: 'Functional' as const,
        preconditions: [`${ticket.environment} is available`, 'QA user can access the relevant storefront flow'],
        steps: [`Navigate to the impacted module: ${ticket.components.join(', ') || ticket.title}`, `Perform the behavior: ${criterion}`, 'Observe UI, data, and state changes'],
        expected_result: criterion,
        test_data: ['QA customer account if auth is required', 'Valid product/test data matching the ticket scope'],
        tags: ['functional', ...baseTags],
      })),
      {
        id: `${ticket.key}-TC-NEG-001`,
        title: 'Validate required-field and invalid-state handling',
        priority: ticket.priority,
        type: 'Negative',
        preconditions: [`${ticket.environment} is available`],
        steps: ['Open the impacted flow', 'Skip or enter invalid required data', 'Submit or continue the flow'],
        expected_result: 'A clear validation message is shown and no incorrect success state is created.',
        test_data: ['Missing field values', 'Invalid input values'],
        tags: ['negative', ...baseTags],
      },
      {
        id: `${ticket.key}-TC-REG-001`,
        title: 'Regression check for impacted modules',
        priority: ticket.priority,
        type: 'Regression',
        preconditions: ['Existing smoke/regression suite is available'],
        steps: ['Run related manual smoke checks', 'Run matching Playwright tags if available', 'Compare behavior against previous release expectations'],
        expected_result: 'Existing critical journeys remain stable.',
        test_data: ['Existing regression test data'],
        tags: ['regression', ...baseTags],
      },
    ];
  }
}
