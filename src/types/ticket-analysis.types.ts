export type JiraTicketSample = {
  ticket_id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  priority: string;
  component: string;
  environment: string;
  assigned_to: string;
};

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type CoverageStatus = 'Covered' | 'Partial' | 'Missing' | 'Manual Only';

export type ManualTestStrategy = {
  positive_scenarios: string[];
  negative_scenarios: string[];
  edge_cases: string[];
  regression_impact: string[];
  ui_checks: string[];
  api_data_checks: string[];
  mobile_responsive_checks: string[];
  accessibility_checks: string[];
};

export type CoverageGap = {
  acceptance_criterion: string;
  status: CoverageStatus;
  matching_tags: string[];
  notes: string;
};

export type GeneratedScript = {
  file_name: string;
  target_folder: string;
  pending_path: string;
  final_path: string;
  content: string;
};

export type TicketAnalysisOutput = {
  ticket_id: string;
  summary: string;
  risk_level: RiskLevel;
  impacted_modules: string[];
  manual_test_scenarios: ManualTestStrategy;
  recommended_existing_tags: string[];
  existing_coverage_status: CoverageStatus;
  missing_coverage: CoverageGap[];
  suggested_playwright_script: string;
  approval_required: boolean;
};

export type CoverageInventory = {
  tags: string[];
  files: string[];
};
