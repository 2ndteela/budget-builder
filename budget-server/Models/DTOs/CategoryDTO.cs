using budget_server.Models;

public class ProjectedExpenseWithTransactionsDTO
{
  public int Id { get; set; }
  public required string Name { get; set; }
  public decimal Value { get; set; }
  public decimal TransactionTotal { get; set; }
  public IEnumerable<Transaction> Transactions { get; set; } = new List<Transaction>();
}

public class CategoryDTO
{
  public int Id { get; set; }
  public required string Name { get; set; }
  public required string Color { get; set; }
  public bool IsIncome { get; set; }
  public IEnumerable<ProjectedExpenseWithTransactionsDTO>? ProjectedExpenses { get; set; }
  public IEnumerable<Transaction>? UnmatchedTransactions { get; set; }
  public int ProjectedTotal { get; set; }
  public int TransactionTotal { get; set; }
}