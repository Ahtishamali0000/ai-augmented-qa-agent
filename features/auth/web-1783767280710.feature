@generated @review-required @module:auth @coverage:partial @risk:medium
Feature: Auth

  Scenario: Successful recorded login flow
    Given I open homepage
    When I navigate to login page
    When I enter valid email
    When I enter valid password
    When I submit login form
    When I search for shoes
    When I open first product
    When I add product to cart
    Then I verify cart confirmation appears
