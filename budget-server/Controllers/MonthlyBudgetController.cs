using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server.Models;
using budget_server.Models.DTOs;

namespace budget_server.Controllers;

[ApiController]
[Route("monthly-budget")]
public class MonthlyBudgetController : ControllerBase
{
  private readonly BudgetContext _context;

  public MonthlyBudgetController(BudgetContext context)
  {
    _context = context;
  }

  [HttpGet]
  public async Task<ActionResult<IEnumerable<MonthlyBudgetDTO>>> GetMonthlyBudgets(
    [FromQuery] string? startDate,
    [FromQuery] string? endDate)
  {
    var startMonth = ParseMonth(startDate);
    var endMonth = ParseMonth(endDate);

    if (!string.IsNullOrEmpty(startDate) && startMonth == null ||
        !string.IsNullOrEmpty(endDate) && endMonth == null)
    {
      return BadRequest("Dates must use the YYYY-MM format.");
    }

    var firstMonth = startMonth ?? endMonth ?? DateTime.Today;
    var lastMonth = startMonth != null && endMonth != null ? endMonth.Value : firstMonth;
    var firstKey = firstMonth.Year * 100 + firstMonth.Month;
    var lastKey = lastMonth.Year * 100 + lastMonth.Month;

    if (firstKey > lastKey) return BadRequest("Start date must not be after end date.");

    var monthlyBudgets = await _context.MonthlyBudgets
      .AsNoTracking()
      .Include(mb => mb.ProjectedExpenses).ThenInclude(pe => pe.Category)
      .Include(mb => mb.Transactions)
      .Where(mb => mb.Year * 100 + mb.Month >= firstKey && mb.Year * 100 + mb.Month <= lastKey)
      .OrderBy(mb => mb.Year)
      .ThenBy(mb => mb.Month)
      .ToListAsync();

    return monthlyBudgets
      .Select(mb => new MonthlyBudgetDTO
      {
        Id = mb.Id,
        Year = mb.Year,
        Month = mb.Month,
        ProjectedExpenses = mb.ProjectedExpenses.Select(expense => new ProjectedExpenseDTO
        {
          Id = expense.Id,
          Name = expense.Name,
          Value = expense.Value,
          CategoryId = expense.CategoryId,
          MonthlyBudgetId = expense.MonthlyBudgetId,
          IsCatchAll = expense.IsCatchAll,
          Category = expense.Category == null ? null : ToCategoryDTO(expense.Category)
        }),
        // Every transaction booked to this month, matched or not. Each carries its
        // ProjectedExpenseId so the client can group them without a second request.
        Transactions = mb.Transactions
          .OrderBy(transaction => transaction.Date)
          .Select(transaction => new TransactionDTO
          {
            Id = transaction.Id,
            BankTransactionId = transaction.BankTransactionId,
            Amount = transaction.Amount,
            Title = transaction.Title,
            Date = transaction.Date,
            AccountId = transaction.AccountId,
            MonthlyBudgetId = transaction.MonthlyBudgetId,
            ProjectedExpenseId = transaction.ProjectedExpenseId
          })
      })
          .ToList();
  }

  [HttpGet("{id:int}")]
  public async Task<ActionResult<MonthlyBudget>> GetMonthlyBudget(int id)
  {
    var monthlyBudget = await _context.MonthlyBudgets.FindAsync(id);

    if (monthlyBudget == null) return NotFound();

    return monthlyBudget;
  }

  [HttpPost]
  public async Task<ActionResult<MonthlyBudget>> CreateMonthlyBudget(MonthlyBudget monthlyBudget)
  {
    if (!IsValidMonth(monthlyBudget.Month)) return BadRequest("Month must be between 1 and 12.");

    if (await MonthlyBudgetExists(monthlyBudget.Year, monthlyBudget.Month))
    {
      return Conflict("A budget already exists for this month.");
    }

    _context.MonthlyBudgets.Add(monthlyBudget);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetMonthlyBudget), new { id = monthlyBudget.Id }, monthlyBudget);
  }

  [HttpPut("{id:int}")]
  public async Task<IActionResult> UpdateMonthlyBudget(int id, MonthlyBudget monthlyBudget)
  {
    if (id != monthlyBudget.Id) return BadRequest();
    if (!IsValidMonth(monthlyBudget.Month)) return BadRequest("Month must be between 1 and 12.");

    if (await _context.MonthlyBudgets.AnyAsync(mb =>
      mb.Id != id && mb.Year == monthlyBudget.Year && mb.Month == monthlyBudget.Month))
    {
      return Conflict("A budget already exists for this month.");
    }

    _context.Entry(monthlyBudget).State = EntityState.Modified;

    try
    {
      await _context.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException)
    {
      if (!await MonthlyBudgetExists(id)) return NotFound();
      throw;
    }

    return NoContent();
  }

  [HttpDelete("{id:int}")]
  public async Task<IActionResult> DeleteMonthlyBudget(int id)
  {
    var monthlyBudget = await _context.MonthlyBudgets.FindAsync(id);
    if (monthlyBudget == null) return NotFound();

    _context.MonthlyBudgets.Remove(monthlyBudget);
    await _context.SaveChangesAsync();

    return NoContent();
  }

  private static bool IsValidMonth(int month)
  {
    return month is >= 1 and <= 12;
  }

  private static CategoryDTO ToCategoryDTO(Category category)
  {
    return new CategoryDTO
    {
      Id = category.Id,
      Name = category.Name,
      Color = category.Color,
      IsIncome = category.IsIncome,
      IsSystem = category.IsSystem
    };
  }

  private static DateTime? ParseMonth(string? value)
  {
    if (string.IsNullOrEmpty(value)) return null;

    return DateTime.TryParseExact(
      value,
      "yyyy-MM",
      System.Globalization.CultureInfo.InvariantCulture,
      System.Globalization.DateTimeStyles.None,
      out var month)
      ? month
      : null;
  }

  private async Task<bool> MonthlyBudgetExists(int id)
  {
    return await _context.MonthlyBudgets.AnyAsync(mb => mb.Id == id);
  }

  private async Task<bool> MonthlyBudgetExists(int year, int month)
  {
    return await _context.MonthlyBudgets.AnyAsync(mb => mb.Year == year && mb.Month == month);
  }
}
