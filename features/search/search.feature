@jira:SF2-478 @module:search @priority:medium @risk:medium @ui @regression
Feature: Product search
  Search coverage is staged until stable test data is agreed.

  @ac:AC-005 @coverage:partial @manual @skip
  Scenario: Review product search results
    Given I open the homepage for search
    When I search for "heels"
    Then I should see product search results
