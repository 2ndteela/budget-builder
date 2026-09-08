namespace budget_server.Models.DTOs;

public class MonthlyBudgetDTO
{
  public int Id { get; set; }
  public int Year { get; set; }
  public int Month { get; set; }
  public IEnumerable<TransactionDTO> Transactions { get; set; } = new List<TransactionDTO>();
  public IEnumerable<ProjectedExpenseDTO> ProjectedExpenses { get; set; } = new List<ProjectedExpenseDTO>();
}