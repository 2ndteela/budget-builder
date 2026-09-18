using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace budget_server.Migrations
{
    /// <inheritdoc />
    public partial class AddUnassignedCategory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ProjectedExpenses_MonthlyBudgetId",
                table: "ProjectedExpenses");

            migrationBuilder.AddColumn<bool>(
                name: "IsCatchAll",
                table: "ProjectedExpenses",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystem",
                table: "Categories",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectedExpenses_MonthlyBudgetId_IsCatchAll",
                table: "ProjectedExpenses",
                columns: new[] { "MonthlyBudgetId", "IsCatchAll" },
                unique: true,
                filter: "\"IsCatchAll\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_IsSystem",
                table: "Categories",
                column: "IsSystem",
                unique: true,
                filter: "\"IsSystem\" = 1");

            // The reserved category every uncategorised row resolves to. Guarded on the flag
            // rather than the name so re-running cannot trip the unique index above.
            migrationBuilder.Sql("""
                INSERT INTO "Categories" ("Name", "Color", "IsIncome", "Archived", "IsSystem")
                SELECT 'Unassigned', 'gray', 0, 0, 1
                WHERE NOT EXISTS (SELECT 1 FROM "Categories" WHERE "IsSystem" = 1);
                """);

            // Existing transactions that were left without a plan are the ones the analysis
            // has been dropping. Give each affected month a catch-all bucket...
            migrationBuilder.Sql("""
                INSERT INTO "ProjectedExpenses" ("Name", "Value", "CategoryId", "MonthlyBudgetId", "IsCatchAll")
                SELECT 'Unassigned', '0', (SELECT "Id" FROM "Categories" WHERE "IsSystem" = 1), mb."Id", 1
                FROM "MonthlyBudgets" mb
                WHERE EXISTS (
                        SELECT 1 FROM "Transactions" t
                        WHERE t."MonthlyBudgetId" = mb."Id" AND t."ProjectedExpenseId" IS NULL
                      )
                  AND NOT EXISTS (
                        SELECT 1 FROM "ProjectedExpenses" pe
                        WHERE pe."MonthlyBudgetId" = mb."Id" AND pe."IsCatchAll" = 1
                      );
                """);

            // ...then point them at it, so no transaction is left dangling.
            migrationBuilder.Sql("""
                UPDATE "Transactions"
                SET "ProjectedExpenseId" = (
                      SELECT pe."Id" FROM "ProjectedExpenses" pe
                      WHERE pe."MonthlyBudgetId" = "Transactions"."MonthlyBudgetId"
                        AND pe."IsCatchAll" = 1
                    )
                WHERE "ProjectedExpenseId" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The rows the Up added stay behind as ordinary categories and expenses: which
            // transactions were originally unplanned is not recoverable once the flag is gone.
            migrationBuilder.DropIndex(
                name: "IX_ProjectedExpenses_MonthlyBudgetId_IsCatchAll",
                table: "ProjectedExpenses");

            migrationBuilder.DropIndex(
                name: "IX_Categories_IsSystem",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "IsCatchAll",
                table: "ProjectedExpenses");

            migrationBuilder.DropColumn(
                name: "IsSystem",
                table: "Categories");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectedExpenses_MonthlyBudgetId",
                table: "ProjectedExpenses",
                column: "MonthlyBudgetId");
        }
    }
}
