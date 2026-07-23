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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Account)
            .WithMany(a => a.Transactions)
            .HasForeignKey(t => t.AccountId);

        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .IsRequired(false);

        modelBuilder.Entity<ProjectedExpense>()
            .HasOne(pe => pe.Category)
            .WithMany(c => c.ProjectedExpenses)
            .HasForeignKey(pe => pe.CategoryId);
    }
}
