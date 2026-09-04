using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server.Models;
using budget_server.Models.DTOs;

namespace budget_server.Controllers;

[ApiController]
[Route("transactions")]
public class TransactionsController : ControllerBase
{
  private readonly BudgetContext _context;

  public TransactionsController(BudgetContext context)
  {
    _context = context;
  }

  [HttpGet]
  public async Task<ActionResult<IEnumerable<Transaction>>> GetTransactions([FromQuery] string? startDate, [FromQuery] string? endDate)
  {
    var query = _context.Transactions
      .Include(t => t.Account)
      .Include(t => t.MonthlyBudget)
      .AsQueryable();

    if (!string.IsNullOrEmpty(startDate))
    {
      if (DateTime.TryParse(startDate + "-01", out var start))
      {
        int endYear;
        int endMonth;

        if (string.IsNullOrEmpty(endDate))
        {
          endYear = start.Year;
          endMonth = start.Month;
        }
        else if (DateTime.TryParse(endDate + "-01", out var end))
        {
          endYear = end.Year;
          endMonth = end.Month;
        }
        else
        {
          return BadRequest("Invalid endDate format. Expected YYYY-MM");
        }

        // Compare months as YYYYMM so a range can span a year boundary
        var startKey = start.Year * 100 + start.Month;
        var endKey = endYear * 100 + endMonth;

        query = query.Where(t =>
          t.MonthlyBudget!.Year * 100 + t.MonthlyBudget.Month >= startKey &&
          t.MonthlyBudget!.Year * 100 + t.MonthlyBudget.Month <= endKey);
      }
      else
      {
        return BadRequest("Invalid startDate format. Expected YYYY-MM");
      }
    }

    return await query
      .OrderByDescending(t => t.MonthlyBudget!.Year)
      .ThenByDescending(t => t.MonthlyBudget!.Month)
      .ThenByDescending(t => t.Date)
      .ToListAsync();
  }

  [HttpGet("{id}")]
  public async Task<ActionResult<Transaction>> GetTransaction(int id)
  {
    var transaction = await _context.Transactions
      .Include(t => t.Account)
      .FirstOrDefaultAsync(t => t.Id == id);

    if (transaction == null) return NotFound();

    return transaction;
  }

  [HttpPost]
  public async Task<ActionResult<Transaction>> CreateTransaction(Transaction transaction)
  {
    _context.Transactions.Add(transaction);
    await _context.SaveChangesAsync();

    return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
  }

  [HttpPost("bulk")]
  public async Task<ActionResult<BulkTransactionResponseDTO>> CreateTransactions(
    [FromBody] IEnumerable<CreateTransactionDTO> transactions
  )
  {
    var transactionList = transactions.Select(dto => new Transaction
    {
      BankTransactionId = dto.BankTransactionId,
      Amount = dto.Amount,
      Title = dto.Title,
      Date = dto.Date,
      AccountId = dto.AccountId,
      MonthlyBudgetId = dto.MonthlyBudgetId,
      ProjectedExpenseId = dto.ProjectedExpenseId
    }).ToList();
    if (transactionList.Count == 0) return BadRequest();

    var allNewTransactions = new List<Transaction>();
    var allDuplicates = new List<Transaction>();
    var inDatabaseDuplicates = new List<Transaction>();
    const int batchSize = 1000;

    for (int i = 0; i < transactionList.Count; i += batchSize)
    {
      var batch = transactionList.Skip(i).Take(batchSize).ToList();

      var bankTransactionIds = batch
        .Where(t => !string.IsNullOrEmpty(t.BankTransactionId))
        .Select(t => t.BankTransactionId)
        .ToHashSet();

      if (bankTransactionIds.Count > 0)
      {
        // Date is now a day of the month, so the old six-month cutoff no longer
        // applies; the bank's transaction id is the duplicate check on its own.
        var existingTransactions = await _context.Transactions
          .Where(t => bankTransactionIds.Contains(t.BankTransactionId))
          .Include(t => t.Account)
          .ToListAsync();

        var existingIds = existingTransactions.Select(t => t.BankTransactionId).ToHashSet();

        var newInBatch = batch
          .Where(t => string.IsNullOrEmpty(t.BankTransactionId) || !existingIds.Contains(t.BankTransactionId))
          .ToList();

        var duplicatesInBatch = batch
          .Where(t => !string.IsNullOrEmpty(t.BankTransactionId) && existingIds.Contains(t.BankTransactionId))
          .ToList();

        allNewTransactions.AddRange(newInBatch);
        allDuplicates.AddRange(duplicatesInBatch);
        inDatabaseDuplicates.AddRange(existingTransactions);
      }
      else
      {
        allNewTransactions.AddRange(batch);
      }
    }

    if (allNewTransactions.Count > 0)
    {
      _context.Transactions.AddRange(allNewTransactions);
      await _context.SaveChangesAsync();
    }

    return Ok(new BulkTransactionResponseDTO
    {
      AcceptedTransactions = allNewTransactions,
      DuplicateTransactions = allDuplicates,
      DatabaseDuplicatedTransactions = inDatabaseDuplicates,
      InsertedCount = allNewTransactions.Count,
      DuplicateCount = allDuplicates.Count
    });
  }

  [HttpPut("{id}")]
  public async Task<IActionResult> UpdateTransaction(int id, Transaction transaction)
  {
    if (id != transaction.Id) return BadRequest();

    _context.Entry(transaction).State = EntityState.Modified;

    try
    {
      await _context.SaveChangesAsync();
    }
    catch (DbUpdateConcurrencyException)
    {
      if (!await TransactionExists(id)) return NotFound();
      throw;
    }

    return NoContent();
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteTransaction(int id)
  {
    var transaction = await _context.Transactions.FindAsync(id);
    if (transaction == null) return NotFound();

    _context.Transactions.Remove(transaction);
    await _context.SaveChangesAsync();

    return NoContent();
  }

  private async Task<bool> TransactionExists(int id)
  {
    return await _context.Transactions.AnyAsync(t => t.Id == id);
  }
}
