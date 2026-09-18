using System.Text.Json.Serialization;

namespace budget_server.Models;

public class ProjectedExpense
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public decimal Value { get; set; }
    public int CategoryId { get; set; }
    public int MonthlyBudgetId { get; set; }

    // The month's catch-all bucket, in the Unassigned category. A transaction booked
    // to no plan lands here instead of dangling with a null ProjectedExpenseId, which
    // is what keeps it inside the analysis. One per monthly budget, created on demand.
    public bool IsCatchAll { get; set; }

    [JsonIgnore]
    public Category? Category { get; set; }
    [JsonIgnore]
    public MonthlyBudget? MonthlyBudget { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
