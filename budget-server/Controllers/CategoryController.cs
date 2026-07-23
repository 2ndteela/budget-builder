using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server.Models;

namespace budget_server.Controllers;

[ApiController]
[Route("category")]
public class CategoryController : ControllerBase
{
    private readonly BudgetContext _context;

    public CategoryController(BudgetContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories([FromQuery] Boolean filterCategories, [FromQuery] string? startDate, [FromQuery] string? endDate)
    {
        var categories = await _context.Categories
            .Include(c => c.ProjectedExpenses)
            .OrderBy(c => c.Name)
            .ToListAsync();

        if (!string.IsNullOrEmpty(startDate))
        {
            var (start, end) = ParseDateRange(startDate, endDate);
            var monthsInRange = GetMonthsInRange(start, end);

            foreach (var category in categories)
            {
                category.ProjectedExpenses = category.ProjectedExpenses
                    .Where(pe => IsExpenseInRange(pe, monthsInRange, start) && filterCategories)
                    .ToList();
            }
        }

        return categories;
    }

    private (DateTime start, DateTime end) ParseDateRange(string startDate, string? endDate)
    {
        DateTime.TryParse(startDate + "-01", out var start);

        if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate + "-01", out var end))
        {
            return (start, new DateTime(end.Year, end.Month, DateTime.DaysInMonth(end.Year, end.Month), 23, 59, 59));
        }

        return (start, new DateTime(start.Year, start.Month, DateTime.DaysInMonth(start.Year, start.Month), 23, 59, 59));
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

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Category>> GetCategory(int id)
    {
        var category = await _context.Categories
            .Include(c => c.ProjectedExpenses)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null) return NotFound();

        return category;
    }

    [HttpPost]
    public async Task<ActionResult<Category>> CreateCategory(Category category)
    {
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(int id, Category category)
    {
        if (id != category.Id) return BadRequest();

        _context.Entry(category).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await CategoryExists(id)) return NotFound();
            throw;
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        List<ProjectedExpense> projectedCostsToRemove = _context.ProjectedExpenses
        .Where(ex => ex.CategoryId == category.Id)
        .ToList();

        List<Transaction> projectTransactionsToUnlink = _context.Transactions
        .Where(ex => ex.CategoryId == category.Id)
        .ToList();

        foreach (var transaction in projectTransactionsToUnlink)
        {
            transaction.CategoryId = null;
            _context.Entry(transaction).State = EntityState.Modified;
        }

        _context.ProjectedExpenses.RemoveRange(projectedCostsToRemove);
        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> CategoryExists(int id)
    {
        return await _context.Categories.AnyAsync(c => c.Id == id);
    }
}
