namespace budget_server.Models.DTOs;

public class CreateTransactionDTO
{
  public string? BankTransactionId { get; set; }
  public decimal Amount { get; set; }
  public required string Title { get; set; }
  // day of the month; the monthly budget carries the month and year
  public int Date { get; set; }
  public int AccountId { get; set; }
  public int MonthlyBudgetId { get; set; }
  public int? ProjectedExpenseId { get; set; }
}
