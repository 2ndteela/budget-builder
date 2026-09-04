public class BudgetAnalysisDTO
{
  public IEnumerable<CategoryDTO>? Categories { get; set; }
  public int TotalIncome { get; set; }
  public int TotalExpense { get; set; }
  public int ProjectedExpense { get; set; }

  // Transactions with no projected expense have no category to sit under
  public IEnumerable<budget_server.Models.Transaction>? UnmatchedTransactions { get; set; }
}

public class BurnUpDataPoint
{
  public string Date { get; set; } = "";
  public long Timestamp { get; set; }
  public int CumulativeProjected { get; set; }
  public int? CumulativeActual { get; set; }
  public int? CumulativeIncome { get; set; }
}

public class BurnUpChartDTO
{
  public IEnumerable<BurnUpDataPoint> DataPoints { get; set; } = new List<BurnUpDataPoint>();
  public int ProjectedTotal { get; set; }
}