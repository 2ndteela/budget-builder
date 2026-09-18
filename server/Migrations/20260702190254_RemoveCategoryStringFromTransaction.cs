using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace budget_server.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCategoryStringFromTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Transactions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Transactions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }
    }
}
