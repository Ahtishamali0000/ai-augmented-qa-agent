import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  FileCheck2,
  Gauge,
  Layers3,
  ListChecks,
  MessageSquareText,
  MonitorSmartphone,
  PlayCircle,
  ShieldCheck,
  TestTube2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from './Badge';
import { MetricCard } from './MetricCard';
import { QaFormattedContent } from '../QaFormattedContent';

type ManualTestCase = {
  id: string;
  title: string;
  priority: string;
  type: string;
  preconditions?: string[];
  steps: string[];
  expected_result: string;
  test_data?: string[];
  tags: string[];
};

type CoverageGap = {
  acceptance_criterion: string;
  coverage_status: string;
  matched_tests: string[];
  missing_scenarios: string[];
  recommended_tags: string[];
  automation_priority: string;
};

export type QaAnalysisViewModel = {
  risk_level: string;
  risk_score: number;
  business_summary?: string;
  qa_summary: string;
  impacted_modules?: string[];
  regression_impact?: string[];
  test_environment: string;
  how_to_test: Record<string, string[] | string>;
  manual_test_cases: ManualTestCase[];
  existing_coverage: CoverageGap[];
  missing_coverage: CoverageGap[];
  comment_insights: string[];
  automation_recommendation: string;
  suggested_playwright_script: {
    suggested_file_path: string;
    module: string;
    tags: string[];
    risk_level: string;
    generated_code: string;
    requires_human_review: boolean;
    assumptions: string[];
  };
};

type ScriptSuggestion = QaAnalysisViewModel['suggested_playwright_script'];

export function QAAnalysisPanel({
  analysis,
  scriptSuggestion,
  qaCommentPreview,
  isBusy,
  onApproveScript,
  onRejectScript,
  onPreparePassedComment,
  onPostPassedComment,
}: {
  analysis: QaAnalysisViewModel;
  scriptSuggestion: ScriptSuggestion | null;
  qaCommentPreview: string;
  isBusy: boolean;
  onApproveScript: () => void;
  onRejectScript: () => void;
  onPreparePassedComment: () => void;
  onPostPassedComment: () => void;
}) {
  const coverageTotals = countCoverage(analysis.existing_coverage);
  const steps = toArray(analysis.how_to_test.step_by_step);
  const preconditions = uniqueItems([
    ...toArray(analysis.how_to_test.preconditions),
    ...analysis.manual_test_cases.flatMap((testCase) => testCase.preconditions || []),
  ]);
  const testData = uniqueItems([
    ...toArray(analysis.how_to_test.test_data_needed),
    ...analysis.manual_test_cases.flatMap((testCase) => testCase.test_data || []),
  ]);
  const testingTypes = uniqueItems([
    ...analysis.manual_test_cases.map((testCase) => testCase.type),
    ...analysis.suggested_playwright_script.tags.map((tag) => tag.replace('@', '')),
  ]).slice(0, 8);
  const affectedAreas = uniqueItems([
    ...(analysis.impacted_modules || []),
    ...toArray(analysis.how_to_test.regression_areas),
  ]).slice(0, 8);

  return (
    <section className="qaDashboard">
      <div className="qaDashboardHeader">
        <div>
          <span className="kicker">AI QA Analysis</span>
          <h3>QA Intelligence Dashboard</h3>
          <p>{analysis.qa_summary}</p>
        </div>
        <Badge tone={riskTone(analysis.risk_level)}>{analysis.risk_level}</Badge>
      </div>

      <section className="qaSummaryGrid" aria-label="QA Summary">
        <MetricCard label="Risk Level" value={analysis.risk_level} tone={riskTone(analysis.risk_level)} />
        <MetricCard label="Risk Score" value={String(analysis.risk_score)} tone={riskTone(analysis.risk_level)} />
        <MetricCard label="Manual Cases" value={String(analysis.manual_test_cases.length)} tone="info" />
        <MetricCard label="Coverage Gaps" value={String(analysis.missing_coverage.length)} tone={analysis.missing_coverage.length ? 'warning' : 'success'} />
        <MetricCard label="Automation" value={analysis.missing_coverage.length ? 'Recommended' : 'Covered'} tone={analysis.missing_coverage.length ? 'warning' : 'success'} />
      </section>

      <div className="qaWorkspaceGrid">
        <div className="qaWorkspaceMain">
          <section className="qaPanel">
            <PanelTitle icon={<Layers3 size={18} />} title="Ticket Overview" detail="Scope and test intent" />
            <div className="qaOverviewGrid">
              <InfoCard title="Purpose" value={firstMeaningful([analysis.business_summary, analysis.qa_summary])} />
              <InfoCard title="Business Impact" value={analysis.business_summary || 'Impact is derived from the Jira ticket scope and affected customer journey.'} />
              <ListCard title="Affected Areas" items={affectedAreas} emptyText="No affected areas detected." />
              <ListCard title="Recommended Testing Types" items={testingTypes} emptyText="No testing types detected." />
            </div>
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<ClipboardCheck size={18} />} title="Manual Testing Strategy" detail="Grouped by QA activity" />
            <div className="strategyGrid">
              <StrategyCard title="Functional Testing" items={[...toArray(analysis.how_to_test.positive_scenarios), ...titleList(analysis.manual_test_cases, 'Functional')]} />
              <StrategyCard title="Responsive Testing" items={toArray(analysis.how_to_test.mobile_responsive_checks)} icon={<MonitorSmartphone size={18} />} />
              <StrategyCard title="Accessibility Testing" items={toArray(analysis.how_to_test.accessibility_checks)} icon={<ShieldCheck size={18} />} />
              <StrategyCard title="Regression Testing" items={[...toArray(analysis.how_to_test.regression_areas), ...(analysis.regression_impact || [])]} icon={<Gauge size={18} />} />
              <StrategyCard title="Negative Testing" items={toArray(analysis.how_to_test.negative_scenarios)} icon={<AlertTriangle size={18} />} />
              <StrategyCard title="Edge Cases" items={toArray(analysis.how_to_test.edge_cases)} icon={<TestTube2 size={18} />} />
            </div>
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<ListChecks size={18} />} title="How To Test" detail={`${steps.length || 0} step(s)`} />
            {steps.length ? (
              <div className="stepCardGrid">
                {steps.map((step, index) => (
                  <article className="stepCard" key={`${step}-${index}`}>
                    <span>Step {index + 1}</span>
                    <p>{stripStepPrefix(step)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyDashboardState text="No step-by-step instructions generated yet." />
            )}
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<FileCheck2 size={18} />} title="Generated Test Cases" detail={`${analysis.manual_test_cases.length} case(s)`} />
            <div className="accordionStack">
              {analysis.manual_test_cases.map((testCase, index) => (
                <details className="testCaseAccordion" key={testCase.id} open={index === 0}>
                  <summary>
                    <span>{testCase.id}</span>
                    <strong>{testCase.title}</strong>
                    <Badge tone={priorityTone(testCase.priority)}>{testCase.priority}</Badge>
                  </summary>
                  <div className="testCaseAccordionBody">
                    <div className="testCaseMeta">
                      <InfoCard title="TC ID" value={testCase.id} />
                      <InfoCard title="Priority" value={testCase.priority} />
                      <InfoCard title="Status" value="Not run" />
                    </div>
                    <div className="qaSubsection">
                      <strong>Preconditions</strong>
                      <BulletList items={testCase.preconditions || []} emptyText="No preconditions specified." />
                    </div>
                    <div className="qaSubsection">
                      <strong>Steps</strong>
                      <ol>
                        {testCase.steps.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                    </div>
                    <InfoCard title="Expected Result" value={testCase.expected_result} />
                    <InfoCard title="Actual Result" value="Not recorded. Complete manual execution to update this field." />
                    <div className="chipRow">
                      <span>{testCase.type}</span>
                      {testCase.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<CheckCircle2 size={18} />} title="Expected vs Actual" detail="Derived from coverage analysis" />
            <div className="comparisonGrid">
              <ComparisonCard title="Expected Result" tone="success" items={analysis.manual_test_cases.map((testCase) => testCase.expected_result)} />
              <ComparisonCard
                title="Actual Result"
                tone={analysis.missing_coverage.length ? 'warning' : 'success'}
                items={analysis.missing_coverage.length ? analysis.missing_coverage.flatMap((gap) => gap.missing_scenarios) : ['No uncovered scenarios detected in the current analysis.']}
              />
            </div>
          </section>
        </div>

        <aside className="qaWorkspaceSide">
          <section className="qaPanel emphasisPanel">
            <PanelTitle icon={<AlertTriangle size={18} />} title="Preconditions" detail="Before testing" />
            <BulletList items={preconditions} emptyText="No preconditions detected." />
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<TestTube2 size={18} />} title="Test Data" detail="Required inputs" />
            <BulletList items={testData} emptyText="No test data detected." />
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<Gauge size={18} />} title="Environment" detail="Execution target" />
            <div className="environmentBadgeGrid">
              {environmentBadges(analysis.test_environment).map((item) => <Badge key={item} tone="info">{item}</Badge>)}
            </div>
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<MessageSquareText size={18} />} title="Jira Comment Insights" detail={`${analysis.comment_insights.length} insight(s)`} />
            <div className="insightStack">
              {analysis.comment_insights.map((insight) => (
                <article className="insightCard" key={insight}>
                  <strong>{insightAuthor(insight)}</strong>
                  <p>{insightBody(insight)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="qaPanel">
            <PanelTitle icon={<Gauge size={18} />} title="Coverage Analysis" detail="Automation status" />
            <CoverageProgress label="Covered" value={coverageTotals.covered} total={analysis.existing_coverage.length} tone="success" />
            <CoverageProgress label="Partially Covered" value={coverageTotals.partial} total={analysis.existing_coverage.length} tone="warning" />
            <CoverageProgress label="Not Covered" value={coverageTotals.missing} total={analysis.existing_coverage.length} tone="danger" />
            <CoverageProgress label="Manual Only" value={coverageTotals.manualOnly} total={analysis.existing_coverage.length} tone="info" />
          </section>
        </aside>
      </div>

      <section className="qaPanel automationPanel">
        <PanelTitle icon={<Code2 size={18} />} title="Automation Recommendations" detail={analysis.suggested_playwright_script.module} />
        <div className="automationPanelGrid">
          <DeveloperCard title="Suggested Playwright Coverage" items={analysis.suggested_playwright_script.tags} />
          <InfoCard title="Suggested File" value={scriptSuggestion?.suggested_file_path || analysis.suggested_playwright_script.suggested_file_path || 'Generate a script to preview the suggested file path.'} />
          <InfoCard title="Automation Effort" value={estimateAutomationEffort(analysis.missing_coverage.length)} />
        </div>
        {scriptSuggestion && (
          <details className="scriptPreviewAccordion">
            <summary>
              <PlayCircle size={16} />
              <span>Generated script preview</span>
            </summary>
            <pre>{scriptSuggestion.generated_code}</pre>
          </details>
        )}
        <div className="automationActionRow">
          <button className="primaryBtn" type="button" onClick={onApproveScript} disabled={isBusy || !scriptSuggestion}>
            Approve Script
          </button>
          <button className="secondaryBtn" type="button" onClick={onRejectScript} disabled={isBusy || !scriptSuggestion}>
            Reject Script
          </button>
        </div>
        <section className="qaSignoffPanel">
          <PanelTitle icon={<CheckCircle2 size={18} />} title="Manual QA Sign-off Comment" detail="Confirm before Jira post" />
          <p className="mutedText">
            When manual validation is working as expected, prepare a professional Jira comment and post it only after confirmation.
          </p>
          {qaCommentPreview ? (
            <div className="qaCommentPreview">
              <QaFormattedContent content={qaCommentPreview} />
              <button className="secondaryBtn" type="button" onClick={() => void navigator.clipboard.writeText(qaCommentPreview)}>Copy for Jira</button>
            </div>
          ) : (
            <div className="jiraEmptyState">No QA pass comment prepared yet.</div>
          )}
          <div className="automationActionRow">
            <button className="secondaryBtn" type="button" onClick={onPreparePassedComment} disabled={isBusy}>
              Prepare Comment
            </button>
            <button className="primaryBtn" type="button" onClick={onPostPassedComment} disabled={isBusy || !qaCommentPreview}>
              Add Comment to Jira
            </button>
          </div>
        </section>
      </section>
    </section>
  );
}

function PanelTitle({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
  return (
    <div className="qaPanelTitle">
      <div>
        {icon}
        <h4>{title}</h4>
      </div>
      {detail && <span>{detail}</span>}
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="qaInfoCard">
      <strong>{title}</strong>
      <p>{value || 'No information available.'}</p>
    </article>
  );
}

function ListCard({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <article className="qaInfoCard">
      <strong>{title}</strong>
      <BulletList items={items} emptyText={emptyText} />
    </article>
  );
}

function StrategyCard({ title, items, icon = <CheckCircle2 size={18} /> }: { title: string; items: string[]; icon?: ReactNode }) {
  return (
    <article className="strategyCard">
      <div>
        {icon}
        <strong>{title}</strong>
      </div>
      <BulletList items={uniqueItems(items).slice(0, 6)} emptyText="No items generated for this strategy." />
    </article>
  );
}

function BulletList({ items, emptyText }: { items: string[]; emptyText: string }) {
  const filtered = uniqueItems(items).filter(Boolean);

  if (!filtered.length) {
    return <p className="mutedText">{emptyText}</p>;
  }

  return (
    <ul>
      {filtered.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function ComparisonCard({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' }) {
  return (
    <article className={`comparisonCard comparisonCard-${tone}`}>
      <strong>{title}</strong>
      <ul>
        {uniqueItems(items).slice(0, 8).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

function CoverageProgress({ label, value, total, tone }: { label: string; value: number; total: number; tone: 'success' | 'warning' | 'danger' | 'info' }) {
  const percentage = total ? Math.round((value / total) * 100) : 0;

  return (
    <div className="coverageProgress">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="progressTrack">
        <span className={`progressFill progressFill-${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function DeveloperCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="developerCard">
      <div>
        <Code2 size={16} />
        <strong>{title}</strong>
      </div>
      <div className="chipRow">
        {items.map((item) => <span key={item}>{item}</span>)}
      </div>
    </article>
  );
}

function EmptyDashboardState({ text }: { text: string }) {
  return <div className="jiraEmptyState">{text}</div>;
}

function countCoverage(items: CoverageGap[]) {
  return items.reduce(
    (totals, item) => {
      if (/covered/i.test(item.coverage_status) && !/partial/i.test(item.coverage_status)) totals.covered += 1;
      else if (/partial/i.test(item.coverage_status)) totals.partial += 1;
      else if (/manual/i.test(item.coverage_status)) totals.manualOnly += 1;
      else totals.missing += 1;
      return totals;
    },
    { covered: 0, partial: 0, missing: 0, manualOnly: 0 },
  );
}

function toArray(value: string[] | string | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function uniqueItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function titleList(testCases: ManualTestCase[], type: string) {
  return testCases.filter((testCase) => testCase.type.toLowerCase().includes(type.toLowerCase())).map((testCase) => testCase.title);
}

function stripStepPrefix(value: string) {
  return value.replace(/^\d+\.\s*/, '').trim();
}

function firstMeaningful(values: Array<string | undefined>) {
  return values.find((value) => value && value.trim()) || 'No purpose generated yet.';
}

function environmentBadges(value: string) {
  return uniqueItems(value.split(/[,/| ]+/)).length ? uniqueItems(value.split(/[,/| ]+/)) : ['N/A'];
}

function insightAuthor(value: string) {
  const [author] = value.split(':');
  return author && author !== value ? author.trim() : 'QA Insight';
}

function insightBody(value: string) {
  const [, ...rest] = value.split(':');
  return rest.length ? rest.join(':').trim() : value;
}

function estimateAutomationEffort(gapCount: number) {
  if (gapCount >= 5) return '4-6 hours';
  if (gapCount >= 2) return '2-3 hours';
  return '1-2 hours';
}

function riskTone(value: string) {
  return /critical|high/i.test(value) ? 'danger' : /medium/i.test(value) ? 'warning' : 'success';
}

function priorityTone(value: string) {
  return /critical|high/i.test(value) ? 'danger' : /medium/i.test(value) ? 'warning' : 'default';
}
