namespace budget_server.Models.DTOs;

public class CreateTransactionDTO
{
  public string? BankTransactionId { get; set; }
  public decimal Amount { get; set; }
  public required string Title { get; set; }
  public long Date { get; set; }
  public int AccountId { get; set; }
  public int? CategoryId { get; set; }
}
