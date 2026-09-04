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
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories([FromQuery] Boolean includeArchived)
    {
        var categories = await _context.Categories
            .Where(c => includeArchived || !c.Archived)
            .OrderBy(c => c.Name)
            .ToListAsync();

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

    // A projected expense belongs to a single monthly budget, so "in range" is just
    // whether that budget's month falls inside the requested window.
    private bool IsExpenseInRange(ProjectedExpense expense, DateTime start, DateTime end)
    {
        var budget = expense.MonthlyBudget;
        if (budget == null) return false;

        var budgetMonth = new DateTime(budget.Year, budget.Month, 1);

        return budgetMonth >= new DateTime(start.Year, start.Month, 1)
            && budgetMonth <= new DateTime(end.Year, end.Month, 1);
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

        // Transactions keep their monthly budget; the FK to the projected expense is
        // set to null by the delete behaviour, leaving them unmatched.
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
