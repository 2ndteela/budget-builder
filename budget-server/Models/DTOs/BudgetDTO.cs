public class BudgetAnalysisDTO
{
  public IEnumerable<CategoryDTO>? Categories { get; set; }
  public int TotalIncome { get; set; }
  public int TotalExpense { get; set; }
  public int ProjectedExpense { get; set; }
}