using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server.Models;

namespace budget_server.Controllers;

[ApiController]
[Route("budget")]
public class BudgetController : ControllerBase
{
  private readonly BudgetContext _context;

  public BudgetController(BudgetContext context)
  {
    _context = context;
  }

  [HttpGet("analysis")]
  public async Task<ActionResult<BudgetAnalysisDTO>> GetBudgetAnalysis([FromQuery] string? startDate, [FromQuery] string? endDate)
  {
    var budgets = await LoadBudgetsInRange(startDate, endDate);

    var categories = await _context.Categories
      .OrderBy(c => c.Name)
      .ToListAsync();

    var expensesInRange = budgets.SelectMany(b => b.ProjectedExpenses).ToList();

    var categoryDTOs = categories.Select(cat =>
    {
      var categoryExpenses = expensesInRange.Where(pe => pe.CategoryId == cat.Id).ToList();

      var projectedExpensesWithTransactions = categoryExpenses.Select(pe => new ProjectedExpenseWithTransactionsDTO
      {
        Id = pe.Id,
        Name = pe.Name,
        Value = pe.Value,
        TransactionTotal = pe.Transactions.Sum(t => t.Amount),
        Transactions = pe.Transactions
      }).ToList();

      return new CategoryDTO
      {
        Id = cat.Id,
        Name = cat.Name,
        Color = cat.Color,
        IsIncome = cat.IsIncome,
        ProjectedExpenses = projectedExpensesWithTransactions,
        // A transaction reaches its category through its projected expense, so an
        // unmatched transaction has no category to be listed under. They come back
        // at the top level of the response instead.
        UnmatchedTransactions = new List<Transaction>(),
        ProjectedTotal = (int)categoryExpenses.Sum(pe => pe.Value),
        TransactionTotal = (int)categoryExpenses.SelectMany(pe => pe.Transactions).Sum(t => t.Amount)
      };
    })
    .ToList();

    var totalIncome = categoryDTOs
      .Where(c => c.IsIncome)
      .Sum(c => c.TransactionTotal);

    var totalExpense = categoryDTOs
      .Where(c => !c.IsIncome)
      .Sum(c => c.TransactionTotal);

    var projectedExpense = categoryDTOs
      .Where(c => !c.IsIncome)
      .Sum(c => c.ProjectedTotal);

    var unmatchedTransactions = budgets
      .SelectMany(b => b.Transactions)
      .Where(t => t.ProjectedExpenseId == null)
      .ToList();

    return Ok(new BudgetAnalysisDTO
    {
      Categories = categoryDTOs,
      TotalIncome = totalIncome,
      TotalExpense = totalExpense,
      ProjectedExpense = projectedExpense,
      UnmatchedTransactions = unmatchedTransactions
    });
  }

  [HttpGet("burnup")]
  public async Task<ActionResult<BurnUpChartDTO>> GetBurnUpChart([FromQuery] string? startDate, [FromQuery] string? endDate)
  {
    var budgets = await LoadBudgetsInRange(startDate, endDate);

    if (budgets.Count == 0)
    {
      var now = DateTime.Now;
      var fallback = await _context.MonthlyBudgets
        .Include(mb => mb.ProjectedExpenses).ThenInclude(pe => pe.Category)
        .Include(mb => mb.ProjectedExpenses).ThenInclude(pe => pe.Transactions)
        .Include(mb => mb.Transactions)
        .Where(mb => mb.Year == now.Year && mb.Month == now.Month)
        .ToListAsync();

      budgets = fallback;
    }

    var expenses = budgets.SelectMany(b => b.ProjectedExpenses).ToList();

    var projectedExpenseTotal = (int)expenses
      .Where(pe => pe.Category != null && !pe.Category.IsIncome)
      .Sum(pe => pe.Value);

    // Only matched transactions can be split into income and expense, since the
    // category is reached through the projected expense.
    var dated = expenses
      .SelectMany(pe => pe.Transactions.Select(t => new
      {
        Date = ToDate(pe.MonthlyBudget!, t.Date),
        t.Amount,
        IsIncome = pe.Category?.IsIncome ?? false
      }))
      .ToList();

    var days = budgets
      .OrderBy(b => b.Year).ThenBy(b => b.Month)
      .SelectMany(b => Enumerable
        .Range(1, DateTime.DaysInMonth(b.Year, b.Month))
        .Select(day => new DateTime(b.Year, b.Month, day)))
      .ToList();

    var dataPoints = new List<BurnUpDataPoint>();
    var dailyProjectedRate = days.Count > 0 ? (decimal)projectedExpenseTotal / days.Count : 0;
    var lastTransactionDate = dated.Count > 0 ? dated.Max(d => d.Date) : days.FirstOrDefault();

    for (var i = 0; i < days.Count; i++)
    {
      var day = days[i];
      var cumulativeProjected = (int)(dailyProjectedRate * (i + 1));

      int? cumulativeExpense = null;
      int? cumulativeIncome = null;

      if (day <= lastTransactionDate)
      {
        cumulativeExpense = (int)dated.Where(d => !d.IsIncome && d.Date <= day).Sum(d => d.Amount);
        cumulativeIncome = (int)dated.Where(d => d.IsIncome && d.Date <= day).Sum(d => d.Amount);
      }

      dataPoints.Add(new BurnUpDataPoint
      {
        Date = day.ToString("MM/dd"),
        Timestamp = new DateTimeOffset(day).ToUnixTimeMilliseconds(),
        CumulativeProjected = cumulativeProjected,
        CumulativeActual = cumulativeExpense,
        CumulativeIncome = cumulativeIncome
      });
    }

    return Ok(new BurnUpChartDTO
    {
      DataPoints = dataPoints,
      ProjectedTotal = projectedExpenseTotal
    });
  }

  // Loads every monthly budget whose month falls in [startDate, endDate], both
  // formatted YYYY-MM. An empty startDate means every budget on record.
  private async Task<List<MonthlyBudget>> LoadBudgetsInRange(string? startDate, string? endDate)
  {
    var query = _context.MonthlyBudgets
      .Include(mb => mb.ProjectedExpenses).ThenInclude(pe => pe.Category)
      .Include(mb => mb.ProjectedExpenses).ThenInclude(pe => pe.Transactions)
      .Include(mb => mb.Transactions)
      .AsQueryable();

    if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate + "-01", out var start))
    {
      var end = start;
      if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate + "-01", out var endParsed))
      {
        end = endParsed;
      }

      // Compare months as YYYYMM so a range can span a year boundary
      var startKey = start.Year * 100 + start.Month;
      var endKey = end.Year * 100 + end.Month;

      query = query.Where(mb => mb.Year * 100 + mb.Month >= startKey && mb.Year * 100 + mb.Month <= endKey);
    }

    return await query
      .OrderBy(mb => mb.Year).ThenBy(mb => mb.Month)
      .ToListAsync();
  }

  // Transaction.Date is a day of the month; the budget supplies month and year
  private static DateTime ToDate(MonthlyBudget budget, int day)
  {
    var daysInMonth = DateTime.DaysInMonth(budget.Year, budget.Month);
    var clamped = Math.Clamp(day, 1, daysInMonth);

    return new DateTime(budget.Year, budget.Month, clamped);
  }
}
