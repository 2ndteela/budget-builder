namespace budget_server.Models.DTOs;

public class ProjectedExpenseDTO
{
  public int Id { get; set; }
  public string? Name { get; set; }
  public decimal Value { get; set; }
  public int CategoryId { get; set; }
  public int MonthlyBudgetId { get; set; }
  public CategoryDTO Category { get; set; }
}