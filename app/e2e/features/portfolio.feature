Feature: My portfolio
  As an investor
  I want to add stocks to my portfolio
  So that I can track my positions

  Scenario: Add a stock to an empty portfolio
    Given I have an empty portfolio and "GGAL" is available
    When I add 3 units of "GGAL" to my portfolio
    Then my portfolio should show "GGAL" with 3 units

  Scenario: Show one chart entry per stock in my portfolio
    Given my portfolio contains "GGAL, YPF, BMA"
    Then the chart should show 3 stocks labeled "GGAL, YPF, BMA"

  Scenario: Open a stock page from my portfolio
    Given my portfolio contains "GGAL"
    When I open stock "GGAL" from my portfolio
    Then I should be on the stock page for "GGAL"

  Scenario: See predictions from multiple models
    Given my portfolio contains "GGAL"
    And "GGAL" has predictions from multiple models
    When I open stock "GGAL" from my portfolio
    Then I should see predictions from 2 models