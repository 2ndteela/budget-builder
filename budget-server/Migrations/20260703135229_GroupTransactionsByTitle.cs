using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace budget_server.Migrations
{
    /// <inheritdoc />
    public partial class GroupTransactionsByTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProjectedExpenseId",
                table: "Transactions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Expiration",
                table: "ProjectedExpenses",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Frequency",
                table: "ProjectedExpenses",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_ProjectedExpenseId",
                table: "Transactions",
                column: "ProjectedExpenseId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_ProjectedExpenses_ProjectedExpenseId",
                table: "Transactions",
                column: "ProjectedExpenseId",
                principalTable: "ProjectedExpenses",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_ProjectedExpenses_ProjectedExpenseId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_ProjectedExpenseId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ProjectedExpenseId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "Expiration",
                table: "ProjectedExpenses");

            migrationBuilder.DropColumn(
                name: "Frequency",
                table: "ProjectedExpenses");
        }
    }
}
