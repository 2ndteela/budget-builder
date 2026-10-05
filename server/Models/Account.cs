namespace budget_server.Models;

public class Account
{
    public int Id { get; set; }
    public required string Name { get; set; }
    // The bank's ACCTID from OFX/QBO exports, so imported statements land in this account
    public string? BankAccountNumber { get; set; }
    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
