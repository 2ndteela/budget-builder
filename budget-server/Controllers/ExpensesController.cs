using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server.Models;

namespace budget_server.Controllers;

[ApiController]
[Route("expenses")]
public class ExpensesController : ControllerBase
{
  private readonly BudgetContext _context;

  public ExpensesController(BudgetContext context)
  {
    _context = context;
  }

  [HttpGet]
  public async Task<ActionResult<IEnumerable<ProjectedExpense>>> GetExpenses()
  {
    return await _context.ProjectedExpenses
      .ToListAsync();
  }

  [HttpGet("{id}")]
  public async Task<ActionResult<ProjectedExpense>> GetExpense(int id)
  {
    var expense = await _context.ProjectedExpenses.FindAsync(id);

    if (expense == null) return NotFound();

    return expense;
  }

  [HttpPost]
  public async Task<ActionResult<ProjectedExpense>> CreateExpense(ProjectedExpense expense)
  {
    _context.ProjectedExpenses.Add(expense);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, expense);
  }

  [HttpPut("{id}")]
  public async Task<IActionResult> UpdateExpense(int id, ProjectedExpense expense)
  {
    if (id != expense.Id) return BadRequest();

    _context.Entry(expense).State = EntityState.Modified;

    try
    {
      await _context.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException)
    {
      if (!await ExpenseExists(id)) return NotFound();
      throw;
    }

    return NoContent();
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteExpense(int id)
  {
    var expense = await _context.ProjectedExpenses.FindAsync(id);
    if (expense == null) return NotFound();

    _context.ProjectedExpenses.Remove(expense);
    await _context.SaveChangesAsync();

    return NoContent();
  }

  private async Task<bool> ExpenseExists(int id)
  {
    return await _context.ProjectedExpenses.AnyAsync(e => e.Id == id);
  }
}
