import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratedScript, JiraTicketSample, TicketAnalysisOutput } from '../types/ticket-analysis.types';

export class TestScriptGeneratorService {
  constructor(private readonly rootDir = process.cwd()) {}

  async generatePendingScript(ticket: JiraTicketSample, analysis: TicketAnalysisOutput): Promise<GeneratedScript> {
    const folder = this.resolveTargetFolder(analysis.recommended_existing_tags);
    const fileName = `${ticket.ticket_id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.feature`;
    const pendingPath = join(this.rootDir, 'generated-tests', 'pending', fileName);
    const finalPath = join(this.rootDir, 'features', folder === 'smoke' ? 'homepage' : folder, fileName);
    const content = this.createFeature(ticket, analysis);

    await mkdir(join(this.rootDir, 'generated-tests', 'pending'), { recursive: true });
    await writeFile(pendingPath, content, 'utf8');

    return {
      file_name: fileName,
      target_folder: folder,
      pending_path: pendingPath,
      final_path: finalPath,
      content,
    };
  }

  private resolveTargetFolder(tags: string[]) {
    if (tags.includes('@checkout') || tags.includes('@payment')) return 'checkout';
    if (tags.includes('@cart')) return 'cart';
    if (tags.includes('@search')) return 'search';
    if (tags.includes('@login') || tags.includes('@register') || tags.includes('@auth')) return 'auth';
    return 'smoke';
  }

  private createFeature(ticket: JiraTicketSample, analysis: TicketAnalysisOutput) {
    const module = this.resolveTargetFolder(analysis.recommended_existing_tags);
    const tags = [...new Set(analysis.recommended_existing_tags)].join(' ');
    const scenarios = ticket.acceptance_criteria.map((criterion, index) => `
  @ac:AC-${String(index + 1).padStart(3, '0')} @coverage:missing @manual @skip
  Scenario: ${this.gherkinText(criterion)}
    Given the ${module} preconditions for ${ticket.ticket_id} are satisfied
    When the customer performs the acceptance criterion
    Then ${this.gherkinText(criterion)}
`).join('');

    return `@jira:${ticket.ticket_id} @module:${module} @priority:${ticket.priority.toLowerCase()} @risk:${analysis.risk_level.toLowerCase()} ${tags}
Feature: ${this.gherkinText(ticket.title)}
  Pending feature generated for human review. Replace generic steps with reusable business steps and POM mappings before removing @skip.
${scenarios || `
  @coverage:missing @manual @skip
  Scenario: Acceptance criteria are required
    Then the Jira story must define testable acceptance criteria
`}
`;
  }

  private gherkinText(value: string) {
    return value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
