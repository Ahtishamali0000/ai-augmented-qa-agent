@jira:SF2-478 @module:checkout @priority:high @risk:high @ui @regression
Feature: Checkout
  Checkout navigation is staged; order placement and payment are always destructive.

  @ac:AC-007 @coverage:partial @manual @skip
  Scenario: Review the checkout surface
    Given I open checkout
    Then I should see the checkout surface

  @ac:AC-008 @coverage:partial @manual @destructive @skip
  Scenario: Complete an order
    Given an approved destructive checkout test is prepared
    Then a human must approve payment completion
