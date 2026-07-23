using budget_server.Models;

public class BulkTransactionResponseDTO
{
  public IEnumerable<Transaction>? AcceptedTransactions { get; set; }
  public IEnumerable<Transaction>? DuplicateTransactions { get; set; }
  public IEnumerable<Transaction>? DatabaseDuplicatedTransactions { get; set; }
  public int InsertedCount { get; set; }
  public int DuplicateCount { get; set; }
}