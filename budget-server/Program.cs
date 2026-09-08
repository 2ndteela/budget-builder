using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using budget_server.Data;
using budget_server;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddControllers();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Add SQLite database. The file and its -wal/-shm sidecars live in db/ to keep them
// out of the project root; the whole directory is gitignored.
var databaseDirectory = Path.Combine(builder.Environment.ContentRootPath, "db");
Directory.CreateDirectory(databaseDirectory);
builder.Services.AddDbContext<BudgetContext>(options =>
    options.UseSqlite($"Data Source={Path.Combine(databaseDirectory, "budget.db")}"));

var app = builder.Build();

// SQLite only removes budget.db-wal and budget.db-shm once the last connection closes,
// and pooled connections outlive the request that opened them. Fold the write-ahead log
// back into the database on shutdown so a Ctrl-C leaves nothing behind.
app.Lifetime.ApplicationStopping.Register(() =>
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();
    context.Database.ExecuteSqlRaw("PRAGMA wal_checkpoint(TRUNCATE);");
    SqliteConnection.ClearAllPools();
});

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<BudgetContext>();

    // Bring the schema up to date before anything reads it, so a fresh clone or a database
    // left behind by an older build boots instead of failing on a missing column.
    context.Database.Migrate();

    if (args.Contains("--seed"))
    {
        Console.WriteLine("Seeding database with demo data...");
        SeedData.Initialize(context);
        Console.WriteLine("Database seeded successfully!");
    }

    // Everything without a category falls back to this row, so it has to exist before the
    // first request. Creating it here covers databases the migration's insert did not touch.
    await BudgetDefaults.GetUnassignedCategoryAsync(context);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

app.MapControllers();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
