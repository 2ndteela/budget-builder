using Microsoft.EntityFrameworkCore;
using budget_server.Models;

namespace budget_server.Data;

public class BudgetContext : DbContext
{
    public BudgetContext(DbContextOptions<BudgetContext> options) : base(options)
    {
    }

    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Account> Accounts { get; set; }
    public DbSet<ProjectedExpense> ProjectedExpenses { get; set; }
    public DbSet<MonthlyBudget> MonthlyBudgets { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MonthlyBudget>()
            .HasIndex(mb => new { mb.Year, mb.Month })
            .IsUnique();

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.MonthlyBudget)
            .WithMany(mb => mb.Transactions)
            .HasForeignKey(t => t.MonthlyBudgetId)
            .OnDelete(DeleteBehavior.Cascade);

        // Dropping a projected expense leaves its transactions in place, unmatched
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.ProjectedExpense)
            .WithMany(pe => pe.Transactions)
            .HasForeignKey(t => t.ProjectedExpenseId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ProjectedExpense>()
            .HasOne(pe => pe.Category)
            .WithMany(c => c.ProjectedExpenses)
            .HasForeignKey(pe => pe.CategoryId);

        modelBuilder.Entity<ProjectedExpense>()
            .HasOne(pe => pe.MonthlyBudget)
            .WithMany(mb => mb.ProjectedExpenses)
            .HasForeignKey(pe => pe.MonthlyBudgetId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
