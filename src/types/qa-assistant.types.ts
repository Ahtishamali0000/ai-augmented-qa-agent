export type JiraAssistantTicket = {
  key: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  status: string;
  priority: string;
  assignee: string;
  reporter: string;
  labels: string[];
  components: string[];
  issueType: string;
  environment: string;
  created: string;
  updated: string;
  comments: JiraTicketComment[];
  url?: string;
};

export type JiraTicketComment = {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
};

export type ManualTestCase = {
  id: string;
  title: string;
  priority: string;
  type: 'Functional' | 'Negative' | 'Edge Case' | 'Regression' | 'UI' | 'API' | 'Accessibility' | 'Responsive';
  preconditions: string[];
  steps: string[];
  expected_result: string;
  test_data: string[];
  tags: string[];
};

export type AssistantCoverageGap = {
  acceptance_criterion: string;
  coverage_status: 'Covered' | 'Partially Covered' | 'Missing' | 'Manual Only';
  matched_tests: string[];
  missing_scenarios: string[];
  recommended_tags: string[];
  automation_priority: 'Low' | 'Medium' | 'High';
};

export type PlaywrightScriptSuggestion = {
  suggested_file_path: string;
  module: string;
  tags: string[];
  risk_level: string;
  generated_code: string;
  requires_human_review: boolean;
  assumptions: string[];
};

export type QaAssistantAnalysis = {
  ticket_key: string;
  title: string;
  issue_type: string;
  business_summary: string;
  qa_summary: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  risk_score: number;
  impacted_modules: string[];
  assumptions: string[];
  dependencies: string[];
  comment_insights: string[];
  test_environment: string;
  how_to_test: {
    what_is_changing: string;
    why_it_matters: string;
    preconditions: string[];
    test_data_needed: string[];
    test_environment: string;
    step_by_step: string[];
    positive_scenarios: string[];
    negative_scenarios: string[];
    edge_cases: string[];
    regression_areas: string[];
    ui_checks: string[];
    api_data_checks: string[];
    mobile_responsive_checks: string[];
    accessibility_checks: string[];
    risks_and_watchouts: string[];
  };
  manual_test_cases: ManualTestCase[];
  regression_impact: string[];
  automation_recommendation: string;
  existing_coverage: AssistantCoverageGap[];
  missing_coverage: AssistantCoverageGap[];
  suggested_playwright_script: PlaywrightScriptSuggestion;
  approval_required: boolean;
};
