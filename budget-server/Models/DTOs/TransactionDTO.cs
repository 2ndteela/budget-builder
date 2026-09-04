namespace budget_server.Models.DTOs;

public class TransactionDTO
{
  public int Id { get; set; }
  public string? BankTransactionId { get; set; }
  public decimal Amount { get; set; }
  public required string Title { get; set; }

  // day of the month the transaction happened. We can derive the month and year from the projected expense the transaction is associated with
  public int Date { get; set; }
  public int AccountId { get; set; }

  // the month this transaction belongs to. Unmatched transactions have no projected
  // expense, so the budget is what places them in time.
  public int MonthlyBudgetId { get; set; }
  public int? ProjectedExpenseId { get; set; }

  public Account? Account { get; set; }

  public MonthlyBudgetDTO MonthlyBudget { get; set; }

  public ProjectedExpenseDTO ProjectedExpense { get; set; }
}
