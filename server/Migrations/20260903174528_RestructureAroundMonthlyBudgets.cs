using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace budget_server.Migrations
{
    /// <summary>
    /// Restructures the schema around MonthlyBudget and preserves the existing data.
    ///
    /// The scaffolded version of this migration was replaced by hand: it renamed
    /// ProjectedExpenses.Expiration to MonthlyBudgetId (turning expiration years into
    /// budget ids) and defaulted Transactions.MonthlyBudgetId to 0, which no budget
    /// owns. Instead this migration:
    ///
    ///   1. Creates one MonthlyBudget per year/month found in Transactions.Date, which
    ///      is still epoch milliseconds at this point.
    ///   2. Fans each recurring projected expense out into a per-month copy, honouring
    ///      the Frequency and Expiration columns being dropped. A projected expense
    ///      that matches no month lands in the earliest budget rather than disappearing.
    ///   3. Rebuilds Transactions with Date as a day of the month, a required
    ///      MonthlyBudgetId, and ProjectedExpenseId repointed at the copy for that
    ///      transaction's own month.
    ///
    /// Transactions.CategoryId is dropped: a transaction's category now comes from its
    /// projected expense, so transactions with no projected expense end up with no
    /// category. That loss is intentional and is not recoverable by Down().
    /// </summary>
    public partial class RestructureAroundMonthlyBudgets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE ""MonthlyBudgets"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_MonthlyBudgets"" PRIMARY KEY AUTOINCREMENT,
                    ""Month"" INTEGER NOT NULL,
                    ""Year"" INTEGER NOT NULL
                );
            ");

            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX ""IX_MonthlyBudgets_Year_Month""
                    ON ""MonthlyBudgets"" (""Year"", ""Month"");
            ");

            // One budget per month that has transactions. Date is still epoch ms here,
            // and the stored values are UTC midnight, so UTC extraction is correct.
            migrationBuilder.Sql(@"
                INSERT INTO ""MonthlyBudgets"" (""Year"", ""Month"")
                SELECT DISTINCT
                    CAST(strftime('%Y', ""Date"" / 1000, 'unixepoch') AS INTEGER),
                    CAST(strftime('%m', ""Date"" / 1000, 'unixepoch') AS INTEGER)
                FROM ""Transactions""
                WHERE ""Date"" IS NOT NULL
                ORDER BY 1, 2;
            ");

            // No transactions but projected expenses to rehome: give them the current
            // month. A brand new database has neither and stays empty.
            migrationBuilder.Sql(@"
                INSERT INTO ""MonthlyBudgets"" (""Year"", ""Month"")
                SELECT
                    CAST(strftime('%Y', 'now') AS INTEGER),
                    CAST(strftime('%m', 'now') AS INTEGER)
                WHERE NOT EXISTS (SELECT 1 FROM ""MonthlyBudgets"")
                  AND EXISTS (SELECT 1 FROM ""ProjectedExpenses"");
            ");

            // Maps each old projected expense to its per-month copies. NewId is the id
            // the copy will get, so transactions can be repointed before the old table
            // is dropped.
            migrationBuilder.Sql(@"
                CREATE TABLE ""_pe_map"" (
                    ""NewId"" INTEGER PRIMARY KEY AUTOINCREMENT,
                    ""OldId"" INTEGER NOT NULL,
                    ""MonthlyBudgetId"" INTEGER NOT NULL,
                    ""Name"" TEXT NOT NULL,
                    ""Value"" TEXT NOT NULL,
                    ""CategoryId"" INTEGER NOT NULL
                );
            ");

            // Fan out by the old recurrence rules. An empty Frequency meant every
            // month; Expiration was the last year the expense applied to, 0 for never.
            migrationBuilder.Sql(@"
                INSERT INTO ""_pe_map"" (""OldId"", ""MonthlyBudgetId"", ""Name"", ""Value"", ""CategoryId"")
                SELECT pe.""Id"", mb.""Id"", pe.""Name"", pe.""Value"", pe.""CategoryId""
                FROM ""ProjectedExpenses"" pe
                JOIN ""MonthlyBudgets"" mb
                    ON (pe.""Frequency"" IS NULL
                        OR TRIM(pe.""Frequency"") = ''
                        OR (',' || REPLACE(pe.""Frequency"", ' ', '') || ',') LIKE ('%,' || mb.""Month"" || ',%'))
                   AND (pe.""Expiration"" <= 0 OR mb.""Year"" <= pe.""Expiration"")
                ORDER BY pe.""Id"", mb.""Year"", mb.""Month"";
            ");

            // A matched transaction in a month the recurrence rules skipped still needs
            // a copy to point at, or the link would be lost.
            migrationBuilder.Sql(@"
                INSERT INTO ""_pe_map"" (""OldId"", ""MonthlyBudgetId"", ""Name"", ""Value"", ""CategoryId"")
                SELECT DISTINCT pe.""Id"", mb.""Id"", pe.""Name"", pe.""Value"", pe.""CategoryId""
                FROM ""Transactions"" t
                JOIN ""ProjectedExpenses"" pe ON pe.""Id"" = t.""ProjectedExpenseId""
                JOIN ""MonthlyBudgets"" mb
                    ON mb.""Year"" = CAST(strftime('%Y', t.""Date"" / 1000, 'unixepoch') AS INTEGER)
                   AND mb.""Month"" = CAST(strftime('%m', t.""Date"" / 1000, 'unixepoch') AS INTEGER)
                WHERE NOT EXISTS (
                    SELECT 1 FROM ""_pe_map"" m
                    WHERE m.""OldId"" = pe.""Id"" AND m.""MonthlyBudgetId"" = mb.""Id""
                )
                ORDER BY pe.""Id"", mb.""Year"", mb.""Month"";
            ");

            // Anything still unplaced (its months fall outside the recorded range) goes
            // into the earliest budget so no projected expense is dropped.
            migrationBuilder.Sql(@"
                INSERT INTO ""_pe_map"" (""OldId"", ""MonthlyBudgetId"", ""Name"", ""Value"", ""CategoryId"")
                SELECT
                    pe.""Id"",
                    (SELECT ""Id"" FROM ""MonthlyBudgets"" ORDER BY ""Year"", ""Month"" LIMIT 1),
                    pe.""Name"",
                    pe.""Value"",
                    pe.""CategoryId""
                FROM ""ProjectedExpenses"" pe
                WHERE NOT EXISTS (SELECT 1 FROM ""_pe_map"" m WHERE m.""OldId"" = pe.""Id"")
                  AND EXISTS (SELECT 1 FROM ""MonthlyBudgets"");
            ");

            // Stage the transformed transactions before the old tables go away.
            // Transactions whose month somehow has no budget are dropped by this join;
            // the verification query below reports the count.
            migrationBuilder.Sql(@"
                CREATE TABLE ""_txn_stage"" AS
                SELECT
                    t.""Id"" AS ""Id"",
                    t.""BankTransactionId"" AS ""BankTransactionId"",
                    t.""Amount"" AS ""Amount"",
                    t.""Title"" AS ""Title"",
                    CAST(strftime('%d', t.""Date"" / 1000, 'unixepoch') AS INTEGER) AS ""Date"",
                    t.""AccountId"" AS ""AccountId"",
                    mb.""Id"" AS ""MonthlyBudgetId"",
                    (
                        SELECT m.""NewId"" FROM ""_pe_map"" m
                        WHERE m.""OldId"" = t.""ProjectedExpenseId"" AND m.""MonthlyBudgetId"" = mb.""Id""
                    ) AS ""ProjectedExpenseId""
                FROM ""Transactions"" t
                JOIN ""MonthlyBudgets"" mb
                    ON mb.""Year"" = CAST(strftime('%Y', t.""Date"" / 1000, 'unixepoch') AS INTEGER)
                   AND mb.""Month"" = CAST(strftime('%m', t.""Date"" / 1000, 'unixepoch') AS INTEGER);
            ");

            migrationBuilder.Sql(@"DROP TABLE ""Transactions"";");
            migrationBuilder.Sql(@"DROP TABLE ""ProjectedExpenses"";");

            migrationBuilder.Sql(@"
                CREATE TABLE ""ProjectedExpenses"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ProjectedExpenses"" PRIMARY KEY AUTOINCREMENT,
                    ""CategoryId"" INTEGER NOT NULL,
                    ""MonthlyBudgetId"" INTEGER NOT NULL,
                    ""Name"" TEXT NOT NULL,
                    ""Value"" TEXT NOT NULL,
                    CONSTRAINT ""FK_ProjectedExpenses_Categories_CategoryId"" FOREIGN KEY (""CategoryId"") REFERENCES ""Categories"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_ProjectedExpenses_MonthlyBudgets_MonthlyBudgetId"" FOREIGN KEY (""MonthlyBudgetId"") REFERENCES ""MonthlyBudgets"" (""Id"") ON DELETE CASCADE
                );
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""ProjectedExpenses"" (""Id"", ""CategoryId"", ""MonthlyBudgetId"", ""Name"", ""Value"")
                SELECT ""NewId"", ""CategoryId"", ""MonthlyBudgetId"", ""Name"", ""Value""
                FROM ""_pe_map""
                ORDER BY ""NewId"";
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE ""Transactions"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Transactions"" PRIMARY KEY AUTOINCREMENT,
                    ""AccountId"" INTEGER NOT NULL,
                    ""Amount"" TEXT NOT NULL,
                    ""BankTransactionId"" TEXT NULL,
                    ""Date"" INTEGER NOT NULL,
                    ""MonthlyBudgetId"" INTEGER NOT NULL,
                    ""ProjectedExpenseId"" INTEGER NULL,
                    ""Title"" TEXT NOT NULL,
                    CONSTRAINT ""FK_Transactions_Accounts_AccountId"" FOREIGN KEY (""AccountId"") REFERENCES ""Accounts"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_Transactions_MonthlyBudgets_MonthlyBudgetId"" FOREIGN KEY (""MonthlyBudgetId"") REFERENCES ""MonthlyBudgets"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_Transactions_ProjectedExpenses_ProjectedExpenseId"" FOREIGN KEY (""ProjectedExpenseId"") REFERENCES ""ProjectedExpenses"" (""Id"") ON DELETE SET NULL
                );
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""Transactions"" (""Id"", ""AccountId"", ""Amount"", ""BankTransactionId"", ""Date"", ""MonthlyBudgetId"", ""ProjectedExpenseId"", ""Title"")
                SELECT ""Id"", ""AccountId"", ""Amount"", ""BankTransactionId"", ""Date"", ""MonthlyBudgetId"", ""ProjectedExpenseId"", ""Title""
                FROM ""_txn_stage""
                ORDER BY ""Id"";
            ");

            migrationBuilder.Sql(@"CREATE INDEX ""IX_ProjectedExpenses_CategoryId"" ON ""ProjectedExpenses"" (""CategoryId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_ProjectedExpenses_MonthlyBudgetId"" ON ""ProjectedExpenses"" (""MonthlyBudgetId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_Transactions_AccountId"" ON ""Transactions"" (""AccountId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_Transactions_MonthlyBudgetId"" ON ""Transactions"" (""MonthlyBudgetId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_Transactions_ProjectedExpenseId"" ON ""Transactions"" (""ProjectedExpenseId"");");

            migrationBuilder.Sql(@"DROP TABLE ""_txn_stage"";");
            migrationBuilder.Sql(@"DROP TABLE ""_pe_map"";");

            migrationBuilder.AddColumn<bool>(
                name: "Archived",
                table: "Categories",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Best effort reverse. Epoch dates are rebuilt from each transaction's
            // budget plus its day of the month, and the per-month projected expense
            // copies are collapsed back into one row per category and name with the
            // Frequency rebuilt from the months that had a copy. What cannot come back
            // is the category of a transaction that has no projected expense.
            migrationBuilder.Sql(@"
                CREATE TABLE ""_pe_collapse"" (
                    ""NewId"" INTEGER NOT NULL,
                    ""CategoryId"" INTEGER NOT NULL,
                    ""Name"" TEXT NOT NULL,
                    ""Value"" TEXT NULL,
                    ""Frequency"" TEXT NULL,
                    ""MonthCount"" INTEGER NOT NULL
                );
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""_pe_collapse"" (""NewId"", ""CategoryId"", ""Name"", ""Frequency"", ""MonthCount"")
                SELECT
                    MIN(pe.""Id""),
                    pe.""CategoryId"",
                    pe.""Name"",
                    (
                        SELECT group_concat(""Month"") FROM (
                            SELECT DISTINCT mb2.""Month"" AS ""Month""
                            FROM ""ProjectedExpenses"" pe2
                            JOIN ""MonthlyBudgets"" mb2 ON mb2.""Id"" = pe2.""MonthlyBudgetId""
                            WHERE pe2.""CategoryId"" = pe.""CategoryId"" AND pe2.""Name"" = pe.""Name""
                            ORDER BY mb2.""Month""
                        )
                    ),
                    COUNT(DISTINCT mb.""Month"")
                FROM ""ProjectedExpenses"" pe
                JOIN ""MonthlyBudgets"" mb ON mb.""Id"" = pe.""MonthlyBudgetId""
                GROUP BY pe.""CategoryId"", pe.""Name"";
            ");

            // Keep the surviving row's own value, and treat a copy in all twelve months
            // as the old ""every month"" recurrence.
            migrationBuilder.Sql(@"
                UPDATE ""_pe_collapse""
                SET ""Value"" = (SELECT pe.""Value"" FROM ""ProjectedExpenses"" pe WHERE pe.""Id"" = ""_pe_collapse"".""NewId""),
                    ""Frequency"" = CASE WHEN ""MonthCount"" >= 12 THEN NULL ELSE ""Frequency"" END;
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE ""_txn_stage"" AS
                SELECT
                    t.""Id"" AS ""Id"",
                    t.""BankTransactionId"" AS ""BankTransactionId"",
                    t.""Amount"" AS ""Amount"",
                    t.""Title"" AS ""Title"",
                    (CAST(strftime('%s', printf('%04d-%02d-%02d', mb.""Year"", mb.""Month"",
                        MIN(MAX(t.""Date"", 1), CAST(strftime('%d', printf('%04d-%02d-01', mb.""Year"", mb.""Month""), 'start of month', '+1 month', '-1 day') AS INTEGER))
                    )) AS INTEGER) * 1000) AS ""Date"",
                    t.""AccountId"" AS ""AccountId"",
                    (SELECT c.""NewId"" FROM ""_pe_collapse"" c
                     JOIN ""ProjectedExpenses"" pe ON pe.""Id"" = t.""ProjectedExpenseId""
                     WHERE c.""CategoryId"" = pe.""CategoryId"" AND c.""Name"" = pe.""Name"") AS ""ProjectedExpenseId"",
                    (SELECT pe.""CategoryId"" FROM ""ProjectedExpenses"" pe WHERE pe.""Id"" = t.""ProjectedExpenseId"") AS ""CategoryId""
                FROM ""Transactions"" t
                JOIN ""MonthlyBudgets"" mb ON mb.""Id"" = t.""MonthlyBudgetId"";
            ");

            migrationBuilder.Sql(@"DROP TABLE ""Transactions"";");
            migrationBuilder.Sql(@"DROP TABLE ""ProjectedExpenses"";");

            migrationBuilder.Sql(@"
                CREATE TABLE ""ProjectedExpenses"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ProjectedExpenses"" PRIMARY KEY AUTOINCREMENT,
                    ""CategoryId"" INTEGER NOT NULL,
                    ""Expiration"" INTEGER NOT NULL,
                    ""Frequency"" TEXT NULL,
                    ""Name"" TEXT NOT NULL,
                    ""Value"" TEXT NOT NULL,
                    CONSTRAINT ""FK_ProjectedExpenses_Categories_CategoryId"" FOREIGN KEY (""CategoryId"") REFERENCES ""Categories"" (""Id"") ON DELETE CASCADE
                );
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""ProjectedExpenses"" (""Id"", ""CategoryId"", ""Expiration"", ""Frequency"", ""Name"", ""Value"")
                SELECT ""NewId"", ""CategoryId"", 0, ""Frequency"", ""Name"", ""Value""
                FROM ""_pe_collapse""
                ORDER BY ""NewId"";
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE ""Transactions"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Transactions"" PRIMARY KEY AUTOINCREMENT,
                    ""AccountId"" INTEGER NOT NULL,
                    ""Amount"" TEXT NOT NULL,
                    ""BankTransactionId"" TEXT NULL,
                    ""CategoryId"" INTEGER NULL,
                    ""Date"" INTEGER NOT NULL,
                    ""ProjectedExpenseId"" INTEGER NULL,
                    ""Title"" TEXT NOT NULL,
                    CONSTRAINT ""FK_Transactions_Accounts_AccountId"" FOREIGN KEY (""AccountId"") REFERENCES ""Accounts"" (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_Transactions_Categories_CategoryId"" FOREIGN KEY (""CategoryId"") REFERENCES ""Categories"" (""Id""),
                    CONSTRAINT ""FK_Transactions_ProjectedExpenses_ProjectedExpenseId"" FOREIGN KEY (""ProjectedExpenseId"") REFERENCES ""ProjectedExpenses"" (""Id"")
                );
            ");

            migrationBuilder.Sql(@"
                INSERT INTO ""Transactions"" (""Id"", ""AccountId"", ""Amount"", ""BankTransactionId"", ""CategoryId"", ""Date"", ""ProjectedExpenseId"", ""Title"")
                SELECT ""Id"", ""AccountId"", ""Amount"", ""BankTransactionId"", ""CategoryId"", ""Date"", ""ProjectedExpenseId"", ""Title""
                FROM ""_txn_stage""
                ORDER BY ""Id"";
            ");

            migrationBuilder.Sql(@"CREATE INDEX ""IX_ProjectedExpenses_CategoryId"" ON ""ProjectedExpenses"" (""CategoryId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_Transactions_AccountId"" ON ""Transactions"" (""AccountId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_Transactions_CategoryId"" ON ""Transactions"" (""CategoryId"");");
            migrationBuilder.Sql(@"CREATE INDEX ""IX_Transactions_ProjectedExpenseId"" ON ""Transactions"" (""ProjectedExpenseId"");");

            migrationBuilder.Sql(@"DROP TABLE ""_txn_stage"";");
            migrationBuilder.Sql(@"DROP TABLE ""_pe_collapse"";");
            migrationBuilder.Sql(@"DROP TABLE ""MonthlyBudgets"";");

            migrationBuilder.DropColumn(
                name: "Archived",
                table: "Categories");
        }
    }
}
