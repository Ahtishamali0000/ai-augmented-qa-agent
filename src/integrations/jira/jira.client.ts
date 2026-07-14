import type { JiraAssistantTicket } from '../../types/qa-assistant.types';

export class JiraClient {
  constructor(
    private readonly baseUrl = process.env.JIRA_BASE_URL || '',
    private readonly email = process.env.JIRA_EMAIL || '',
    private readonly apiToken = process.env.JIRA_API_TOKEN || '',
  ) {}

  isConfigured() {
    return Boolean(this.baseUrl && this.email && this.apiToken);
  }

  async searchAssignedTickets(maxResults = 25): Promise<JiraAssistantTicket[]> {
    const jql = 'assignee=currentUser() ORDER BY updated DESC';
    return this.searchByJql(jql, maxResults);
  }

  async searchByJql(jql: string, maxResults = 25): Promise<JiraAssistantTicket[]> {
    const response = await this.searchTickets(jql, maxResults, ['summary', 'description', 'comment', 'status', 'priority', 'assignee', 'reporter', 'labels', 'components', 'issuetype', 'created', 'updated']);
    return (response.issues || []).map((issue: any) => this.normalizeIssue(issue));
  }

  async getTicket(ticketKey: string): Promise<JiraAssistantTicket> {
    const issue = await this.request(`/rest/api/3/issue/${encodeURIComponent(ticketKey)}?fields=summary,description,comment,status,priority,assignee,reporter,labels,components,issuetype,created,updated`);
    return this.normalizeIssue(issue);
  }

  async addComment(ticketKey: string, comment: string) {
    const trimmed = comment.trim();

    if (!trimmed) {
      throw new Error('Comment is required');
    }

    return this.request(`/rest/api/3/issue/${encodeURIComponent(ticketKey)}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: toAtlassianDocument(trimmed) }),
    });
  }

  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Jira API failed (${response.status}): ${details}`);
    }

    return response.json();
  }

  private async searchTickets(jql: string, maxResults: number, fields: string[]) {
    const searchParams = new URLSearchParams({
      jql,
      maxResults: String(maxResults),
      fields: fields.join(','),
    });

    return this.request(`/rest/api/3/search/jql?${searchParams.toString()}`);
  }

  private normalizeIssue(issue: any): JiraAssistantTicket {
    const fields = issue.fields || {};

    return {
      key: issue.key,
      title: fields.summary || '',
      description: extractPlainText(fields.description),
      acceptanceCriteria: extractAcceptanceCriteria(fields.description),
      status: fields.status?.name || '',
      priority: fields.priority?.name || 'None',
      assignee: fields.assignee?.displayName || 'Unassigned',
      reporter: fields.reporter?.displayName || '',
      labels: fields.labels || [],
      components: (fields.components || []).map((component: any) => component.name),
      issueType: fields.issuetype?.name || '',
      environment: process.env.DEFAULT_TEST_ENV || 'CF',
      created: fields.created || '',
      updated: fields.updated || '',
      comments: normalizeComments(fields.comment?.comments || []),
      url: `${this.baseUrl.replace(/\/$/, '')}/browse/${issue.key}`,
    };
  }
}

function normalizeComments(comments: any[]) {
  return comments.map((comment) => ({
    id: comment.id || '',
    author: comment.author?.displayName || 'Unknown',
    body: extractPlainText(comment.body),
    created: comment.created || '',
    updated: comment.updated || '',
  })).filter((comment) => comment.body);
}

function extractPlainText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(extractPlainText).filter(Boolean).join(' ');
  return '';
}

function toAtlassianDocument(value: string) {
  return {
    type: 'doc',
    version: 1,
    content: value.split(/\r?\n/).map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}

function extractAcceptanceCriteria(node: any): string[] {
  const text = extractPlainText(node);
  const matches = text.split(/\n|•|- /).map((item) => item.trim()).filter((item) => /should|must|can|verify|given|when|then/i.test(item));
  return matches.length ? matches : ['Acceptance criteria not found in Jira description. Validate behavior against ticket summary and QA notes.'];
}
