@jira:SF2-478 @module:homepage @priority:high @risk:medium @ui @regression @smoke @homepage
Feature: Homepage header validation
  The storefront header must expose the primary customer journeys.

  @ac:AC-001 @coverage:covered
  Scenario: Verify homepage header elements
    Given I open the homepage
    Then I should see the EGO logo
    And I should see the search bar
    And I should see the account icon
    And I should see the wishlist icon
    And I should see the bag icon
