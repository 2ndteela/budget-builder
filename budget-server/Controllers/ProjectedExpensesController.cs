using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server.Models;
using budget_server.Models.DTOs;
using System.Runtime.CompilerServices;

namespace budget_server.Controllers;

[ApiController]
[Route("projected-expenses")]
public class ProjectedExpensesController : ControllerBase
{
  private readonly BudgetContext _context;

  public ProjectedExpensesController(BudgetContext context)
  {
    _context = context;
  }

  [HttpGet]
  public async Task<ActionResult<IEnumerable<ProjectedExpense>>> GetProjectedExpenses()
  {
    return await _context.ProjectedExpenses
      .ToListAsync();
  }

  [HttpGet("suggestions")]
  public async Task<ActionResult<IEnumerable<ProjectedExpenseDTO>>> GetProjectedExpenseSuggestions([FromQuery] string? date)
  {
    var endDate = ParseMonth(date) ?? DateTime.Today;
    var startDate = endDate.AddMonths(-3);
    var startKey = startDate.Year * 100 + startDate.Month;
    var endKey = endDate.Year * 100 + endDate.Month;

    var previousTransactions = await _context.Transactions
      .Include(t => t.MonthlyBudget)
      .Include(t => t.ProjectedExpense!).ThenInclude(pe => pe.Category)
      .Where(t => t.MonthlyBudget!.Year * 100 + t.MonthlyBudget.Month >= startKey &&
                  t.MonthlyBudget.Year * 100 + t.MonthlyBudget.Month <= endKey)
      .ToListAsync();

    var groupedByTitle = new Dictionary<string, List<Transaction>>();

    for (int i = 0; i < previousTransactions.Count; i++)
    {
      var current = previousTransactions[i];

      if (groupedByTitle.TryGetValue(current.Title, out var existing))
        existing.Add(current);
      else
        groupedByTitle.Add(current.Title, new List<Transaction> { current });
    }

    var suggestions = new List<ProjectedExpenseDTO>();

    // A suggestion never comes back without a category — a title we can't attribute to
    // anything falls back to Unassigned, so it can be accepted as-is.
    var unassigned = await BudgetDefaults.GetUnassignedCategoryAsync(_context);

    foreach (var group in groupedByTitle.Values)
    {
      // 1). total spent across the group
      var totalSpent = group.Sum(t => t.Amount);
      var uniqueMonths = group.Select(t => t.MonthlyBudgetId).Distinct().Count();
      var averageSpent = uniqueMonths > 0 ? totalSpent / uniqueMonths : totalSpent;

      // 2). most common category tied to the group's transactions
      var mostCommonCategory = group
        .Where(t => t.ProjectedExpense?.Category != null)
        .GroupBy(t => t.ProjectedExpense!.Category!)
        .OrderByDescending(g => g.Count())
        .Select(g => g.Key)
        .FirstOrDefault() ?? unassigned;

      // 3). Use transaction title as suggestion name
      var suggestionName = group.First().Title;

      // 4). build the suggestion from the totals and most common category/expense above
      suggestions.Add(new ProjectedExpenseDTO
      {
        Name = suggestionName,
        SuggestedValue = Math.Ceiling(averageSpent),
        SuggestedCategory = new CategoryDTO
        {
          Id = mostCommonCategory.Id,
          Name = mostCommonCategory.Name,
          Color = mostCommonCategory.Color,
          IsIncome = mostCommonCategory.IsIncome,
          IsSystem = mostCommonCategory.IsSystem
        }
      });
    }

    // 5). serve the suggestions back to the user
    return suggestions;
  }

  [HttpGet("{id}")]
  public async Task<ActionResult<ProjectedExpense>> GetProjectedExpense(int id)
  {
    var expense = await _context.ProjectedExpenses.FindAsync(id);

    if (expense == null) return NotFound();

    return expense;
  }

  [HttpPost]
  public async Task<ActionResult<ProjectedExpense>> CreateProjectedExpense(ProjectedExpense expense)
  {
    // No category picked is a valid way to plan an expense; it lands in Unassigned.
    expense.CategoryId = await BudgetDefaults.ResolveCategoryIdAsync(_context, expense.CategoryId);
    expense.IsCatchAll = false;

    _context.ProjectedExpenses.Add(expense);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetProjectedExpense), new { id = expense.Id }, expense);
  }

  // Folds several plans into one. Done server-side and in a transaction because the delete
  // route sends orphaned transactions to the month's Unassigned bucket — running this as N
  // client calls would scatter the history the combined plan is supposed to inherit.
  [HttpPost("combine")]
  public async Task<ActionResult<ProjectedExpenseDTO>> CombineProjectedExpenses(CombineProjectedExpensesDTO request)
  {
    if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("A name is required.");

    var sourceIds = request.SourceExpenseIds.Distinct().ToList();

    if (sourceIds.Count < 2) return BadRequest("Combining takes at least two expenses.");

    var sources = await _context.ProjectedExpenses
      .Include(pe => pe.Transactions)
      .Where(pe => sourceIds.Contains(pe.Id))
      .ToListAsync();

    if (sources.Count != sourceIds.Count) return NotFound();

    if (sources.Any(pe => pe.IsCatchAll))
    {
      return BadRequest($"The {BudgetDefaults.UnassignedName} bucket is maintained automatically and cannot be combined.");
    }

    // One combined plan belongs to one month, so mixing months has no valid result
    var monthlyBudgetId = sources[0].MonthlyBudgetId;

    if (sources.Any(pe => pe.MonthlyBudgetId != monthlyBudgetId))
    {
      return BadRequest("All expenses must belong to the same monthly budget.");
    }

    var categoryId = await BudgetDefaults.ResolveCategoryIdAsync(_context, request.CategoryId);

    var combined = new ProjectedExpense
    {
      Name = request.Name.Trim(),
      // No value sent means keep the month's total where it was
      Value = request.Value ?? sources.Sum(pe => pe.Value),
      CategoryId = categoryId,
      MonthlyBudgetId = monthlyBudgetId,
      IsCatchAll = false
    };

    await using var dbTransaction = await _context.Database.BeginTransactionAsync();

    _context.ProjectedExpenses.Add(combined);
    await _context.SaveChangesAsync();

    // The spend the originals accounted for carries over to the combined plan. Materialised
    // first: reassigning the FK makes EF move the row off the collection being walked.
    var inheritedTransactions = sources.SelectMany(pe => pe.Transactions).ToList();

    foreach (var transaction in inheritedTransactions)
    {
      transaction.ProjectedExpenseId = combined.Id;
    }

    await _context.SaveChangesAsync();

    _context.ProjectedExpenses.RemoveRange(sources);
    await _context.SaveChangesAsync();

    await dbTransaction.CommitAsync();

    var category = await _context.Categories.FindAsync(categoryId);

    // A DTO rather than the entity: the transactions just repointed at this expense are
    // loaded on its navigation, and serializing them cycles back through ProjectedExpense.
    return new ProjectedExpenseDTO
    {
      Id = combined.Id,
      Name = combined.Name,
      Value = combined.Value,
      CategoryId = combined.CategoryId,
      MonthlyBudgetId = combined.MonthlyBudgetId,
      IsCatchAll = combined.IsCatchAll,
      Category = category == null ? null : new CategoryDTO
      {
        Id = category.Id,
        Name = category.Name,
        Color = category.Color,
        IsIncome = category.IsIncome,
        IsSystem = category.IsSystem
      }
    };
  }

  [HttpPut("{id}")]
  public async Task<IActionResult> UpdateProjectedExpense(int id, ProjectedExpense expense)
  {
    if (id != expense.Id) return BadRequest();

    var existing = await _context.ProjectedExpenses.FindAsync(id);
    if (existing == null) return NotFound();

    if (existing.IsCatchAll)
    {
      return BadRequest($"The {BudgetDefaults.UnassignedName} bucket is maintained automatically and cannot be edited.");
    }

    existing.Name = expense.Name;
    existing.Value = expense.Value;
    existing.CategoryId = await BudgetDefaults.ResolveCategoryIdAsync(_context, expense.CategoryId);

    try
    {
      await _context.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException)
    {
      if (!await ProjectedExpenseExists(id)) return NotFound();
      throw;
    }

    return NoContent();
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteProjectedExpense(int id)
  {
    var expense = await _context.ProjectedExpenses
      .Include(pe => pe.Transactions)
      .FirstOrDefaultAsync(pe => pe.Id == id);

    if (expense == null) return NotFound();

    if (expense.IsCatchAll)
    {
      return BadRequest($"The {BudgetDefaults.UnassignedName} bucket is maintained automatically and cannot be deleted.");
    }

    // Move the transactions to the month's catch-all rather than letting the FK go null,
    // which would drop them out of the analysis.
    if (expense.Transactions.Count > 0)
    {
      var catchAll = await BudgetDefaults.GetCatchAllExpenseAsync(_context, expense.MonthlyBudgetId);

      foreach (var transaction in expense.Transactions)
      {
        transaction.ProjectedExpenseId = catchAll.Id;
      }

      await _context.SaveChangesAsync();
    }

    _context.ProjectedExpenses.Remove(expense);
    await _context.SaveChangesAsync();

    return NoContent();
  }

  private async Task<bool> ProjectedExpenseExists(int id)
  {
    return await _context.ProjectedExpenses.AnyAsync(e => e.Id == id);
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

}
