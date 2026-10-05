using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace budget_server.Migrations
{
    /// <inheritdoc />
    public partial class AddBankAccountNumberToAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankAccountNumber",
                table: "Accounts",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountNumber",
                table: "Accounts");
        }
    }
}
