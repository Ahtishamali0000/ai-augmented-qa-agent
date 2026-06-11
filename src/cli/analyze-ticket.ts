import { readFile } from 'node:fs/promises';
import { basename, relative } from 'node:path';
import { ApprovalService } from '../services/approval.service';
import { CoverageGapService } from '../services/coverage-gap.service';
import { TestScriptGeneratorService } from '../services/test-script-generator.service';
import { TicketAnalysisService } from '../services/ticket-analysis.service';
import type { GeneratedScript, JiraTicketSample, TicketAnalysisOutput } from '../types/ticket-analysis.types';

const args = process.argv.slice(2);
const isApprovalRun = args.includes('--approve');
const ticketPath = getArgValue('--ticket') || 'samples/jira-ticket.json';

if (isApprovalRun) {
  await approvePendingScript();
} else {
  await analyzeTicket();
}

async function analyzeTicket() {
  const ticket = await readTicket(ticketPath);
  const coverageService = new CoverageGapService();
  const analysisService = new TicketAnalysisService();
  const generatorService = new TestScriptGeneratorService();
  const coverage = await coverageService.analyze(ticket);
  const analysis = analysisService.analyze(ticket, coverage);
  const generatedScript = await generatorService.generatePendingScript(ticket, analysis);
  const output: TicketAnalysisOutput = {
    ...analysis,
    suggested_playwright_script: toRelative(generatedScript.pending_path),
  };

  printAnalysis(output, generatedScript);
}

async function approvePendingScript() {
  const pendingFile = getArgValue('--file');
  const targetFolder = getArgValue('--target');

  if (!pendingFile || !targetFolder) {
    throw new Error('Approval requires --file <pending spec file> and --target <smoke|auth|search|cart|checkout>.');
  }

  const result = await new ApprovalService().approvePendingTest(pendingFile, targetFolder);

  console.log('Human approval recorded. Test added to Playwright framework.');
  console.log(`Pending source: ${toRelative(result.pendingPath)}`);
  console.log(`Framework path: ${toRelative(result.finalPath)}`);
}

async function readTicket(path: string): Promise<JiraTicketSample> {
  const content = await readFile(path, 'utf8');
  return JSON.parse(content) as JiraTicketSample;
}

function printAnalysis(analysis: TicketAnalysisOutput, generatedScript: GeneratedScript) {
  console.log('\nAI QA Ticket Analysis - Mock AI Mode');
  console.log('====================================');
  console.log(`Ticket: ${analysis.ticket_id}`);
  console.log(`Summary: ${analysis.summary}`);
  console.log(`Risk Level: ${analysis.risk_level}`);
  console.log(`Impacted Modules: ${analysis.impacted_modules.join(', ')}`);

  console.log('\nManual Test Strategy');
  printList('Positive scenarios', analysis.manual_test_scenarios.positive_scenarios);
  printList('Negative scenarios', analysis.manual_test_scenarios.negative_scenarios);
  printList('Edge cases', analysis.manual_test_scenarios.edge_cases);
  printList('Regression impact', analysis.manual_test_scenarios.regression_impact);
  printList('UI checks', analysis.manual_test_scenarios.ui_checks);
  printList('API/data checks', analysis.manual_test_scenarios.api_data_checks);
  printList('Mobile/responsive checks', analysis.manual_test_scenarios.mobile_responsive_checks);
  printList('Accessibility checks', analysis.manual_test_scenarios.accessibility_checks);

  console.log('\nExisting Automation Coverage');
  console.log(`Recommended tags: ${analysis.recommended_existing_tags.join(', ')}`);
  console.log(`Overall status: ${analysis.existing_coverage_status}`);

  console.log('\nMissing Coverage Detection');
  for (const gap of analysis.missing_coverage) {
    console.log(`- [${gap.status}] ${gap.acceptance_criterion}`);
    console.log(`  ${gap.notes}`);
  }

  console.log('\nSuggested Playwright Script');
  console.log(`Pending path: ${toRelative(generatedScript.pending_path)}`);
  console.log(`Target framework path after approval: ${toRelative(generatedScript.final_path)}`);
  console.log(`Approval required: ${analysis.approval_required ? 'Yes' : 'No'}`);

  console.log('\nDo you approve adding this test to the Playwright framework?');
  console.log('If yes, run:');
  console.log(`npm run approve:ticket -- --file ${basename(generatedScript.pending_path)} --target ${generatedScript.target_folder}`);
  console.log('No file was added to tests/e2e during analysis.');
}

function printList(title: string, items: string[]) {
  console.log(`${title}:`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
}

function getArgValue(name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function toRelative(path: string) {
  return relative(process.cwd(), path).replace(/\\/g, '/');
}
