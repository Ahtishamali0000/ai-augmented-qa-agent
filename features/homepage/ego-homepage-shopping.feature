@jira:EGO-HOME-001 @module:homepage @priority:high @risk:medium @ui @regression @homepage @ego
Feature: EGO homepage merchandising
  Customers should be able to discover homepage merchandising sections and start a shopping journey.

  @ac:AC-001 @coverage:covered
  Scenario: Verify homepage merchandising sections and add a What's Hot product to the bag
    Given I open the US storefront homepage
    Then I should see the "Co-Ords" trend category
    And I should see the "Dresses" trend category
    And I should see the "Shoes" trend category
    And I should see the "Swimwear" trend category
    And I should see the Popular Categories section
    And I should see the What's Hot section
    When I add a visible What's Hot product to the bag
    Then the product should be added to the bag
