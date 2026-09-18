namespace budget_server.Models.DTOs;

public class CategoryDTO
{
  public int Id { get; set; }
  public required string Name { get; set; }
  public required string Color { get; set; }
  public bool IsIncome { get; set; }

  // True for the reserved "Unassigned" category, which the client renders read-only
  public bool IsSystem { get; set; }
}
