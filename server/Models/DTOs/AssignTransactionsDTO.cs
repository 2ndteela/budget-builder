namespace budget_server.Models.DTOs;

// Several transactions booked onto one plan in a single request. A null ProjectedExpenseId
// sends them back to their month's Unassigned bucket, same as clearing the plan on one.
public class AssignTransactionsDTO
{
  public List<int> TransactionIds { get; set; } = new();
  public int? ProjectedExpenseId { get; set; }
}
