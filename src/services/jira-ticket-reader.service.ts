import { readFile } from 'node:fs/promises';
import { JiraClient } from '../integrations/jira/jira.client';
import type { JiraAssistantTicket } from '../types/qa-assistant.types';
import type { JiraTicketSample } from '../types/ticket-analysis.types';

export class JiraTicketReaderService {
  constructor(private readonly jiraClient = new JiraClient()) {}

  async readTickets(): Promise<JiraAssistantTicket[]> {
    if (this.jiraClient.isConfigured()) {
      return this.jiraClient.searchAssignedTickets();
    }

    return [await this.readLocalSample()];
  }

  async readTicket(ticketKey: string): Promise<JiraAssistantTicket> {
    if (this.jiraClient.isConfigured() && ticketKey !== 'LOCAL-SAMPLE') {
      return this.jiraClient.getTicket(ticketKey);
    }

    return this.readLocalSample();
  }

  private async readLocalSample(): Promise<JiraAssistantTicket> {
    const sample = JSON.parse(await readFile('samples/jira-ticket.json', 'utf8')) as JiraTicketSample;

    return {
      key: sample.ticket_id,
      title: sample.title,
      description: sample.description,
      acceptanceCriteria: sample.acceptance_criteria,
      status: 'Local Sample',
      priority: sample.priority,
      assignee: sample.assigned_to,
      reporter: 'Local JSON',
      labels: ['mock-ai', 'local-json'],
      components: sample.component.split(',').map((item) => item.trim()).filter(Boolean),
      issueType: 'Story',
      environment: sample.environment,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      comments: [
        {
          id: 'local-comment-1',
          author: 'Local QA Context',
          body: 'Use Jira comments here to capture QA notes, developer clarifications, scope changes, known risks, and release instructions.',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ],
    };
  }
}
