@jira:VSF2-822 @module:checkout @priority:medium @risk:high @regression @ui @search @cart @payment @login @register
Feature: Success Page (Guest) - Confirm Password auto-fills and Sign Up button is not functional
  Pending feature generated for review. Implement missing step and POM methods before removing @skip.

  @ac:AC-001 @coverage:missing @manual @skip
  Scenario: Steps to Reproduce: Place an order as a guest user. Navigate to the Success page. Enter a password and observe the Confirm Password field. Click the Sign Up button. Actual Result: The Confirm Password field is automatically populated with the same value entered in the Password field without any user input. The Sign Up button is not functional and does not create an account. Expected Result: The Confirm Password field should remain empty until the user manually enters the confirmation password. The Sign Up button should successfully create the account after the user enters matching valid passwords in both fields.
    Given the checkout preconditions for VSF2-822 are satisfied
    When the customer performs the acceptance criterion
    Then Steps to Reproduce: Place an order as a guest user. Navigate to the Success page. Enter a password and observe the Confirm Password field. Click the Sign Up button. Actual Result: The Confirm Password field is automatically populated with the same value entered in the Password field without any user input. The Sign Up button is not functional and does not create an account. Expected Result: The Confirm Password field should remain empty until the user manually enters the confirmation password. The Sign Up button should successfully create the account after the user enters matching valid passwords in both fields.

