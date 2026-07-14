import { appendFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import {
  ensureReportDirectories,
  extractTags,
  featureName,
  normalizeStatus,
  writeQaArtifacts,
  type QaResult,
} from './report-utils';

class QaPipelineReporter implements Reporter {
  private readonly results: QaResult[] = [];
  private readonly streamPath = resolve(process.cwd(), 'reports/ndjson/live-output.ndjson');

  onBegin(_config: FullConfig) {
    ensureReportDirectories();
    writeFileSync(this.streamPath, '');
    this.event({ type: 'run_started', timestamp: new Date().toISOString() });
  }

  onTestBegin(test: TestCase) {
    this.event({
      type: 'test_started',
      scenario: test.title,
      feature: featureName(test.location.file),
      browser: test.parent.project()?.name || 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const attachments = result.attachments || [];
    const record: QaResult = {
      title: test.title,
      feature: featureName(test.location.file),
      featureFile: this.featureFile(test.location.file),
      browser: test.parent.project()?.name || 'unknown',
      status: normalizeStatus(result.status),
      duration: result.duration,
      tags: extractTags(`${test.title} ${(test.tags || []).join(' ')}`),
      error: result.error?.message,
      stack: result.error?.stack,
      screenshot: this.attachment(attachments, 'screenshot'),
      trace: this.attachment(attachments, 'trace'),
      video: this.attachment(attachments, 'video'),
    };
    this.results.push(record);

    this.event({
      type: record.status === 'passed' ? 'test_passed' : record.status === 'skipped' ? 'test_skipped' : 'test_failed',
      scenario: record.title,
      feature: record.feature,
      browser: record.browser,
      duration: record.duration,
      timestamp: new Date().toISOString(),
      ...(record.error ? { error: record.error } : {}),
      ...(record.screenshot ? { screenshot: record.screenshot } : {}),
      ...(record.trace ? { trace: record.trace } : {}),
    });
  }

  onEnd(result: FullResult) {
    writeQaArtifacts(this.results);
    this.event({
      type: 'run_finished',
      status: result.status,
      timestamp: new Date().toISOString(),
    });
  }

  private event(payload: Record<string, unknown>) {
    appendFileSync(this.streamPath, `${JSON.stringify(payload)}\n`);
  }

  private attachment(attachments: TestResult['attachments'], name: string) {
    return attachments.find((item) => item.name.toLowerCase().includes(name))?.path || '';
  }

  private featureFile(file: string) {
    const generatedRoot = resolve(process.cwd(), 'tests/.features-gen');
    const generated = relative(generatedRoot, file).replaceAll('\\', '/');
    if (!generated.startsWith('../') && generated !== '..') {
      return `features/${generated.replace(/\.spec\.[cm]?[jt]s$/i, '')}`;
    }
    return relative(process.cwd(), file).replaceAll('\\', '/');
  }
}

export default QaPipelineReporter;
