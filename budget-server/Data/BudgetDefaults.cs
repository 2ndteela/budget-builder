using Microsoft.EntityFrameworkCore;
using budget_server.Models;

namespace budget_server.Data;

// Anything that reaches the database without a category resolves through here. The
// fallbacks are real rows, not a display-time substitution, so a projected expense with
// no category and a transaction with no plan are both still joinable and still show up
// in the analysis.
public static class BudgetDefaults
{
    public const string UnassignedName = "Unassigned";
    public const string UnassignedColor = "gray";

    // The single IsSystem category. Created on demand so a database that predates the
    // migration, or one built by EnsureCreated, still ends up with it.
    public static async Task<Category> GetUnassignedCategoryAsync(BudgetContext context)
    {
        var category = await context.Categories.FirstOrDefaultAsync(c => c.IsSystem);
        if (category != null) return category;

        category = new Category
        {
            Name = UnassignedName,
            Color = UnassignedColor,
            IsIncome = false,
            IsSystem = true
        };

        context.Categories.Add(category);
        await context.SaveChangesAsync();

        return category;
    }

    // Falls back to Unassigned when the caller sent no category, or sent one that no
    // longer exists. Returning an id rather than validating lets every write path share
    // one rule.
    public static async Task<int> ResolveCategoryIdAsync(BudgetContext context, int categoryId)
    {
        if (categoryId > 0 && await context.Categories.AnyAsync(c => c.Id == categoryId))
        {
            return categoryId;
        }

        return (await GetUnassignedCategoryAsync(context)).Id;
    }

    // The month's catch-all expense, created the first time the month needs one.
    public static async Task<ProjectedExpense> GetCatchAllExpenseAsync(BudgetContext context, int monthlyBudgetId)
    {
        var expense = await context.ProjectedExpenses
            .FirstOrDefaultAsync(pe => pe.MonthlyBudgetId == monthlyBudgetId && pe.IsCatchAll);

        if (expense != null) return expense;

        var unassigned = await GetUnassignedCategoryAsync(context);

        expense = new ProjectedExpense
        {
            Name = UnassignedName,
            Value = 0,
            CategoryId = unassigned.Id,
            MonthlyBudgetId = monthlyBudgetId,
            IsCatchAll = true
        };

        context.ProjectedExpenses.Add(expense);
        await context.SaveChangesAsync();

        return expense;
    }

    // Points a transaction at the catch-all when it was booked against no plan. Callers
    // still have to SaveChanges; this only fills the field in.
    public static async Task AssignCatchAllIfUnmatchedAsync(BudgetContext context, Transaction transaction)
    {
        if (transaction.ProjectedExpenseId != null) return;

        var catchAll = await GetCatchAllExpenseAsync(context, transaction.MonthlyBudgetId);
        transaction.ProjectedExpenseId = catchAll.Id;
    }
}
