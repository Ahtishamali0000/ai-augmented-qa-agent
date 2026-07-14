@jira:SF2-478 @module:auth @priority:medium @risk:high @ui @regression @register
Feature: Customer registration
  Registration remains reviewable but is excluded from stable automation until the environment is allowlisted.

  @ac:AC-003 @coverage:partial @manual @skip
  Scenario: Review the customer registration form
    Given I open the customer registration form
    Then I should see the registration form
