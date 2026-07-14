import { loadResultsFromPlaywrightJson, writeQaArtifacts } from '../reporters/report-utils';

const results = loadResultsFromPlaywrightJson();
writeQaArtifacts(results);
console.log(`Generated reports/excel/test-case-matrix.xlsx from ${results.length} test result(s).`);
