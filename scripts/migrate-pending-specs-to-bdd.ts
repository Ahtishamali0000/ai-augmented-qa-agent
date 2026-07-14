import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const root = process.cwd();
const pendingDir = join(root, 'generated-tests', 'pending');
const entries = (await readdir(pendingDir)).filter((name) => name.endsWith('.spec.ts')).sort();
const manifest = [];

await mkdir(pendingDir, { recursive: true });

for (const sourceFile of entries) {
  const source = await readFile(join(pendingDir, sourceFile), 'utf8');
  const ticketKey = basename(sourceFile, '.spec.ts').toUpperCase();
  const tags = [...new Set(source.match(/@[A-Za-z0-9_-]+/g) || [])];
  const rawTitle = extractTitle(source) || `${ticketKey} pending automation`;
  const title = cleanTitle(rawTitle, ticketKey);
  const moduleName = inferModule(`${title} ${tags.join(' ')}`);
  const featureFile = `${basename(sourceFile, '.spec.ts')}.feature`;
  const reviewFile = `${basename(sourceFile, '.spec.ts')}.review.json`;
  const activeTags = tags.filter((tag) => !['@smoke'].includes(tag)).join(' ');

  const feature = `@jira:${ticketKey} @module:${moduleName} @priority:unassigned @risk:unassessed ${activeTags} @manual @skip
Feature: ${title}
  This review-only feature replaces a generic pending Playwright draft.
  Jira acceptance criteria and deterministic test data are required before activation.

  @ac:AC-MISSING @coverage:missing
  Scenario: Define executable acceptance criteria for ${ticketKey}
    Given the reviewed Jira acceptance criteria are available
    When QA maps each criterion to reusable POM behavior
    Then covered, partial, and missing automation must be recorded explicitly
`;

  const review = {
    ticketKey,
    title,
    module: moduleName,
    status: 'pending-human-review',
    coverage: 'missing',
    generatedFeature: `generated-tests/pending/${featureFile}`,
    legacySource: `generated-tests/pending/${sourceFile}`,
    legacySourcePreserved: true,
    activationBlockedBy: [
      'Acceptance criteria are not present in the legacy draft.',
      'The legacy draft uses generic heels search data that currently returns zero products.',
      'Step definitions and POM methods have not been reviewed for this ticket.',
    ],
    approvalChecklist: [
      'Import the Jira acceptance criteria.',
      'Replace AC-MISSING with stable AC IDs.',
      'Remove generic steps and map business steps to existing POM methods.',
      'Supply environment-owned deterministic test data.',
      'Remove @manual and @skip only after focused execution passes.',
    ],
  };

  await writeFile(join(pendingDir, featureFile), feature, 'utf8');
  await writeFile(join(pendingDir, reviewFile), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
  manifest.push(review);
}

await writeFile(
  join(pendingDir, 'migration-manifest.json'),
  `${JSON.stringify({ schemaVersion: 1, count: manifest.length, packages: manifest }, null, 2)}\n`,
  'utf8',
);

console.log(`Created ${manifest.length} review-only BDD package(s) in generated-tests/pending.`);

function extractTitle(source: string) {
  return source.match(/test\.describe\(['"`]([^'"`]+)/)?.[1]
    || source.match(/test\(['"`]([^'"`]+)/)?.[1]
    || '';
}

function cleanTitle(value: string, ticketKey: string) {
  return value
    .replace(/@[A-Za-z0-9_-]+/g, '')
    .replace(new RegExp(`^${ticketKey}\\s*`, 'i'), '')
    .replace(/\s+/g, ' ')
    .trim() || `${ticketKey} pending automation`;
}

function inferModule(value: string) {
  const text = value.toLowerCase();
  if (/footer|legal|policy/.test(text)) return 'footer';
  if (/checkout|payment/.test(text)) return 'checkout';
  if (/cart|bag|basket|product/.test(text)) return 'cart';
  if (/login|register|account|auth/.test(text)) return 'auth';
  if (/search|faq|canonical|hreflang|url/.test(text)) return 'search';
  return 'homepage';
}
