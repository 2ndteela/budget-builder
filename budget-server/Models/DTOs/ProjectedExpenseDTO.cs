namespace budget_server.Models.DTOs;

public class ProjectedExpenseDTO
{
  public int Id { get; set; }
  public string? Name { get; set; }
  public decimal Value { get; set; }
  public decimal SuggestedValue { get; set; }
  public int CategoryId { get; set; }
  public int MonthlyBudgetId { get; set; }

  // The month's automatically maintained Unassigned bucket; not editable by the client
  public bool IsCatchAll { get; set; }
  public CategoryDTO? Category { get; set; }
  public CategoryDTO? SuggestedCategory { get; set; }
}
