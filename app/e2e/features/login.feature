Feature: Login
  As an investor
  I want to sign in
  So that I can view my portfolio

  Scenario: Sign in with valid credentials
    Given the backend accepts valid credentials
    When I open the login form
    And I submit valid credentials
    Then I should see my portfolio

  Scenario: Reject invalid credentials
    Given the backend rejects login
    When I open the login form
    And I submit invalid credentials
    Then I should see the login error "Email o contraseña incorrectos"