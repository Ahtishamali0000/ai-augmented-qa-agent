@jira:SF2-478 @module:cart @priority:medium @risk:medium @ui @regression
Feature: Shopping bag
  Empty-bag coverage is staged for review.

  @ac:AC-006 @coverage:partial @manual @skip
  Scenario: Review the shopping bag surface
    Given I open the shopping bag
    Then I should see the shopping bag surface
