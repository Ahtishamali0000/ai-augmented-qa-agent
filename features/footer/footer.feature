@jira:SF2-478 @module:footer @priority:medium @risk:low @ui @regression
Feature: Footer navigation
  Footer coverage is staged for human review before activation.

  @ac:AC-004 @coverage:partial @manual @skip
  Scenario: Review footer navigation links
    Given I open the storefront footer
    Then I should see the footer
    And the footer should contain navigation links
