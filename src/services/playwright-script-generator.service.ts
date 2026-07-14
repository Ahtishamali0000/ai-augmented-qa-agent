import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { JiraAssistantTicket, PlaywrightScriptSuggestion, QaAssistantAnalysis } from '../types/qa-assistant.types';

export class PlaywrightScriptGeneratorService {
  constructor(private readonly rootDir = process.cwd()) {}

  async generate(ticket: JiraAssistantTicket, analysis: QaAssistantAnalysis): Promise<PlaywrightScriptSuggestion> {
    const module = analysis.suggested_playwright_script.module;
    const fileName = `${ticket.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.feature`;
    const pendingPath = join(this.rootDir, 'generated-tests', 'pending', fileName);
    const generatedCode = this.createFeature(ticket, analysis);

    await mkdir(join(this.rootDir, 'generated-tests', 'pending'), { recursive: true });
    await writeFile(pendingPath, generatedCode, 'utf8');

    return {
      suggested_file_path: `generated-tests/pending/${fileName}`,
      module,
      tags: analysis.suggested_playwright_script.tags,
      risk_level: analysis.risk_level,
      generated_code: generatedCode,
      requires_human_review: true,
      assumptions: ['Map each pending business step to an existing POM method before activation.', 'Generated feature stays in pending until approved.'],
    };
  }

  private createFeature(ticket: JiraAssistantTicket, analysis: QaAssistantAnalysis) {
    const tags = analysis.suggested_playwright_script.tags.join(' ');
    const criteria = ticket.acceptanceCriteria.length ? ticket.acceptanceCriteria : ['Acceptance criteria must be supplied'];
    const scenarios = criteria.map((criterion, index) => `
  @ac:AC-${String(index + 1).padStart(3, '0')} @coverage:missing @manual @skip
  Scenario: ${this.gherkinText(criterion)}
    Given the ${analysis.suggested_playwright_script.module} preconditions for ${ticket.key} are satisfied
    When the customer performs the acceptance criterion
    Then ${this.gherkinText(criterion)}
`).join('');

    return `@jira:${ticket.key} @module:${analysis.suggested_playwright_script.module} @priority:${ticket.priority.toLowerCase()} @risk:${analysis.risk_level.toLowerCase()} ${tags}
Feature: ${this.gherkinText(ticket.title)}
  Pending feature generated for review. Implement missing step and POM methods before removing @skip.
${scenarios}
`;
  }

  private gherkinText(value: string) {
    return value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
