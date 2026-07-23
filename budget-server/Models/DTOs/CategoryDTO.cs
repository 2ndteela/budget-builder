using budget_server.Models;

public class CategoryDTO
{
  public int Id { get; set; }
  public required string Name { get; set; }
  public required string Color { get; set; }
  public bool IsIncome { get; set; }
  public IEnumerable<ProjectedExpense>? ProjectedExpenses { get; set; }
  public IEnumerable<Transaction>? Transactions { get; set; }
  public int ProjectedTotal { get; set; }
  public int TransactionTotal { get; set; }
}