import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { CoverageGap, CoverageInventory, CoverageStatus, JiraTicketSample } from '../types/ticket-analysis.types';

const tagToKeywords: Record<string, string[]> = {
  '@login': ['login', 'sign in', 'registered customer', 'account'],
  '@register': ['register', 'registration', 'create account'],
  '@search': ['search', 'results', 'keyword'],
  '@cart': ['cart', 'bag', 'basket', 'add'],
  '@checkout': ['checkout', 'payment', 'delivery'],
  '@payment': ['payment', 'card', 'paypal'],
  '@ui': ['display', 'visible', 'page', 'message', 'count', 'surface'],
  '@smoke': ['can ', 'loads', 'basic', 'critical'],
  '@regression': ['regression', 'existing', 'impact'],
};

export class CoverageGapService {
  constructor(private readonly rootDir = process.cwd()) {}

  async analyze(ticket: JiraTicketSample) {
    const inventory = await this.readCoverageInventory();
    const recommendedTags = this.recommendTags(ticket);
    const gaps = ticket.acceptance_criteria.map((criterion) => this.evaluateCriterion(criterion, inventory, recommendedTags));
    const existingCoverageStatus = this.resolveOverallStatus(gaps);

    return {
      recommendedTags,
      existingCoverageStatus,
      gaps,
      inventory,
    };
  }

  async readCoverageInventory(): Promise<CoverageInventory> {
    const testDir = join(this.rootDir, 'tests', 'e2e');
    const files = await this.collectSpecFiles(testDir);
    const tags = new Set<string>();

    for (const file of files) {
      const content = await readFile(file, 'utf8');
      for (const match of content.matchAll(/@[a-zA-Z0-9_-]+/g)) {
        tags.add(match[0]);
      }
    }

    return {
      tags: [...tags].sort(),
      files: files.map((file) => relative(this.rootDir, file).replace(/\\/g, '/')).sort(),
    };
  }

  recommendTags(ticket: JiraTicketSample) {
    const text = `${ticket.title} ${ticket.description} ${ticket.acceptance_criteria.join(' ')} ${ticket.component}`.toLowerCase();
    const tags = new Set<string>(['@regression', '@ui']);

    for (const [tag, keywords] of Object.entries(tagToKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        tags.add(tag);
      }
    }

    if (ticket.priority.toLowerCase() === 'high' || ticket.priority.toLowerCase() === 'critical') {
      tags.add('@smoke');
    }

    return [...tags];
  }

  private evaluateCriterion(criterion: string, inventory: CoverageInventory, recommendedTags: string[]): CoverageGap {
    const text = criterion.toLowerCase();
    const matchingTags = recommendedTags.filter((tag) => tagToKeywords[tag]?.some((keyword) => text.includes(keyword)));
    const existingMatches = matchingTags.filter((tag) => inventory.tags.includes(tag));
    const status: CoverageStatus = this.resolveCriterionStatus(text, matchingTags, existingMatches);

    return {
      acceptance_criterion: criterion,
      status,
      matching_tags: existingMatches,
      notes: this.createNotes(status, matchingTags, existingMatches),
    };
  }

  private resolveCriterionStatus(text: string, matchingTags: string[], existingMatches: string[]): CoverageStatus {
    if (/captcha|cloudflare|legal|manual approval|third party/i.test(text)) {
      return 'Manual Only';
    }

    if (!matchingTags.length) {
      return 'Missing';
    }

    if (matchingTags.length === existingMatches.length) {
      return 'Covered';
    }

    if (existingMatches.length > 0) {
      return 'Partial';
    }

    return 'Missing';
  }

  private resolveOverallStatus(gaps: CoverageGap[]): CoverageStatus {
    if (gaps.every((gap) => gap.status === 'Covered')) return 'Covered';
    if (gaps.every((gap) => gap.status === 'Manual Only')) return 'Manual Only';
    if (gaps.some((gap) => gap.status === 'Covered' || gap.status === 'Partial')) return 'Partial';
    return 'Missing';
  }

  private createNotes(status: CoverageStatus, matchingTags: string[], existingMatches: string[]) {
    if (status === 'Covered') return `Existing tags appear to cover this criterion: ${existingMatches.join(', ')}`;
    if (status === 'Partial') return `Some related coverage exists (${existingMatches.join(', ')}), but missing tags include ${matchingTags.filter((tag) => !existingMatches.includes(tag)).join(', ')}`;
    if (status === 'Manual Only') return 'This criterion should remain manual for MVP because it depends on an uncontrolled or risky flow.';
    return matchingTags.length ? `Recommended tags are not currently represented by existing specs: ${matchingTags.join(', ')}` : 'No matching automation tag was found for this criterion.';
  }

  private async collectSpecFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    const nested = await Promise.all(
      entries.map((entry) => {
        const entryPath = join(directory, entry.name);
        if (entry.isDirectory()) return this.collectSpecFiles(entryPath);
        if (entry.isFile() && entry.name.endsWith('.spec.ts')) return Promise.resolve([entryPath]);
        return Promise.resolve([]);
      }),
    );

    return nested.flat();
  }
}
