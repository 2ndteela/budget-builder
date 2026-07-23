using System.Text.Json.Serialization;

namespace budget_server.Models;

public class Transaction
{
    public int Id { get; set; }
    public string? BankTransactionId { get; set; }
    public decimal Amount { get; set; }
    public required string Title { get; set; }
    public long Date { get; set; } // milliseconds since epoch
    public int AccountId { get; set; }
    public int? CategoryId { get; set; }
    public int? ProjectedExpenseId { get; set; }

    [JsonIgnore]
    public Account? Account { get; set; }

    [JsonIgnore]
    public Category? Category { get; set; }

    [JsonIgnore]
    public ProjectedExpense? ProjectedExpense { get; set; }
}
