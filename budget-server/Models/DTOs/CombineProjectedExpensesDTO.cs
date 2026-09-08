namespace budget_server.Models.DTOs;

// Several plans folded into one. The client sends what the combined plan should look like
// plus the plans it replaces; the server moves their transactions over and removes them.
public class CombineProjectedExpensesDTO
{
  public string? Name { get; set; }

  // Omitted means "whatever the originals added up to", so the month's total stays put
  public decimal? Value { get; set; }
  public int CategoryId { get; set; }
  public int MonthlyBudgetId { get; set; }
  public List<int> SourceExpenseIds { get; set; } = new();
}
