import { loadResultsFromPlaywrightJson, writeQaArtifacts } from '../reporters/report-utils';

const results = loadResultsFromPlaywrightJson();
writeQaArtifacts(results);
console.log(`Generated Markdown reports for ${results.length} test result(s) in reports/markdown.`);
