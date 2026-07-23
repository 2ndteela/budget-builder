namespace budget_server.Models;

public class Account
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
