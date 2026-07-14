@jira:SF2-478 @module:auth @priority:high @risk:high @ui @regression @auth @login @unstable
Feature: Customer login
  Registered customers must be able to access their account.

  @ac:AC-002 @coverage:partial
  Scenario: Login with configured customer credentials
    Given configured customer credentials are available
    When I sign in with the configured customer credentials
    Then I should reach the authenticated customer area
