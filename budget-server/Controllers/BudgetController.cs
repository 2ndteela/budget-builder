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
    var categories = await _context.Categories
      .Include(c => c.ProjectedExpenses)
      .Include(c => c.Transactions).ThenInclude(t => t.ProjectedExpense)
      .ToListAsync();

    long? startTimestamp = null;
    long? endTimestamp = null;
    DateTime? start = null;
    DateTime? end = null;
    List<int> monthsInRange = new List<int>();

    if (!string.IsNullOrEmpty(startDate))
    {
      if (DateTime.TryParse(startDate + "-01", out var startParsed))
      {
        start = startParsed;
        if (string.IsNullOrEmpty(endDate))
        {
          var endOfMonth = new DateTime(startParsed.Year, startParsed.Month, DateTime.DaysInMonth(startParsed.Year, startParsed.Month), 23, 59, 59);
          end = endOfMonth;
          startTimestamp = new DateTimeOffset(startParsed).ToUnixTimeMilliseconds();
          endTimestamp = new DateTimeOffset(endOfMonth).ToUnixTimeMilliseconds();
        }
        else if (DateTime.TryParse(endDate + "-01", out var endParsed))
        {
          var endOfEndMonth = new DateTime(endParsed.Year, endParsed.Month, DateTime.DaysInMonth(endParsed.Year, endParsed.Month), 23, 59, 59);
          end = endOfEndMonth;
          startTimestamp = new DateTimeOffset(startParsed).ToUnixTimeMilliseconds();
          endTimestamp = new DateTimeOffset(endOfEndMonth).ToUnixTimeMilliseconds();
        }

        monthsInRange = GetMonthsInRange(start.Value, end.Value);
      }
    }

    var categoryDTOs = categories.Select(cat =>
    {
      var filteredExpenses = cat.ProjectedExpenses.AsEnumerable();
      if (start.HasValue && end.HasValue)
      {
        filteredExpenses = filteredExpenses.Where(pe => IsExpenseInRange(pe, monthsInRange, start.Value));
      }

      var projectedExpensesList = filteredExpenses.ToList();
      var projectedTotal = CalculateProjectedTotal(projectedExpensesList, monthsInRange);

      var filteredTransactions = cat.Transactions.AsEnumerable();
      if (startTimestamp.HasValue && endTimestamp.HasValue)
      {
        filteredTransactions = filteredTransactions.Where(t => t.Date >= startTimestamp.Value && t.Date <= endTimestamp.Value);
      }

      var groupedTransactions = filteredTransactions
        .GroupBy(t => t.Title)
        .Select(g => new Transaction
        {
          Id = g.First().Id,
          Title = g.Key,
          Amount = g.Sum(t => t.Amount),
          Date = g.First().Date,
          CategoryId = g.First().CategoryId
        })
        .ToList();

      var transactionTotal = groupedTransactions.Sum(t => (int)t.Amount);

      return new CategoryDTO
      {
        Id = cat.Id,
        Name = cat.Name,
        Color = cat.Color,
        IsIncome = cat.IsIncome,
        ProjectedExpenses = projectedExpensesList,
        Transactions = groupedTransactions,
        ProjectedTotal = projectedTotal,
        TransactionTotal = transactionTotal
      };
    })
    .OrderBy(c => c.Name)
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

    return Ok(new BudgetAnalysisDTO
    {
      Categories = categoryDTOs,
      TotalIncome = totalIncome,
      TotalExpense = totalExpense,
      ProjectedExpense = projectedExpense
    });
  }

  private List<int> GetMonthsInRange(DateTime start, DateTime end)
  {
    var months = new List<int>();
    var current = start;

    while (current <= end)
    {
      months.Add(current.Month);
      current = current.AddMonths(1);
    }

    return months.Distinct().ToList();
  }

  private bool IsExpenseInRange(ProjectedExpense expense, List<int> monthsInRange, DateTime rangeStart)
  {
    if (expense.Expiration != 0 && rangeStart.Year > expense.Expiration)
    {
      return false;
    }

    var frequency = expense.Frequency;
    if (string.IsNullOrEmpty(frequency))
    {
      return true;
    }

    var expenseMonths = frequency.Split(',', StringSplitOptions.RemoveEmptyEntries)
      .Select(int.Parse)
      .ToList();

    return expenseMonths.Any(m => monthsInRange.Contains(m));
  }

  private int CalculateProjectedTotal(List<ProjectedExpense> expenses, List<int> monthsInRange)
  {
    int total = 0;

    foreach (var expense in expenses)
    {
      var frequency = expense.Frequency;
      if (string.IsNullOrEmpty(frequency))
      {
        total += (int)expense.Value * monthsInRange.Count;
      }
      else
      {
        var expenseMonths = frequency.Split(',', StringSplitOptions.RemoveEmptyEntries)
          .Select(int.Parse)
          .ToList();

        var occurrences = monthsInRange.Count(m => expenseMonths.Contains(m));
        total += (int)expense.Value * occurrences;
      }
    }

    return total;
  }
}
