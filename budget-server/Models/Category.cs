namespace budget_server.Models;

public class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Color { get; set; }
    public bool IsIncome { get; set; }
    public bool Archived { get; set; }

    // Marks the reserved "Unassigned" category. Exactly one row carries this flag; it
    // cannot be deleted or renamed, because everything without a category falls back
    // to it. See BudgetDefaults.
    public bool IsSystem { get; set; }
    public ICollection<ProjectedExpense> ProjectedExpenses { get; set; } = new List<ProjectedExpense>();
}
