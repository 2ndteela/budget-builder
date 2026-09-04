namespace budget_server.Models;

public class MonthlyBudget
{
  public int Id { get; set; }
  public int Month { get; set; }
  public int Year { get; set; }
  public ICollection<ProjectedExpense> ProjectedExpenses { get; set; } = new List<ProjectedExpense>();
  public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
