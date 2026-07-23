namespace budget_server.Models;

public class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Color { get; set; }
    public bool IsIncome { get; set; }
    public ICollection<ProjectedExpense> ProjectedExpenses { get; set; } = new List<ProjectedExpense>();
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
