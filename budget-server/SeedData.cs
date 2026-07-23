using budget_server.Data;
using budget_server.Models;

namespace budget_server;

public static class SeedData
{
    public static void Initialize(BudgetContext context)
    {
        // Clear existing data
        context.Transactions.RemoveRange(context.Transactions);
        context.ProjectedExpenses.RemoveRange(context.ProjectedExpenses);
        context.Categories.RemoveRange(context.Categories);
        context.Accounts.RemoveRange(context.Accounts);
        context.SaveChanges();

        // Seed Accounts
        var accounts = new Account[]
        {
            new Account { Name = "Chase Checking" },
            new Account { Name = "Wells Fargo Savings" },
            new Account { Name = "Capital One Credit Card" }
        };
        context.Accounts.AddRange(accounts);
        context.SaveChanges();

        // Seed Categories
        var categories = new Category[]
        {
            new Category { Name = "Groceries", Color = "green", IsIncome = false },
            new Category { Name = "Dining Out", Color = "orange", IsIncome = false },
            new Category { Name = "Utilities", Color = "blue", IsIncome = false },
            new Category { Name = "Rent", Color = "red", IsIncome = false },
            new Category { Name = "Transportation", Color = "purple", IsIncome = false },
            new Category { Name = "Entertainment", Color = "pink", IsIncome = false },
            new Category { Name = "Shopping", Color = "yellow", IsIncome = false },
            new Category { Name = "Healthcare", Color = "teal", IsIncome = false },
            new Category { Name = "Salary", Color = "green", IsIncome = true },
            new Category { Name = "Freelance Income", Color = "blue", IsIncome = true }
        };
        context.Categories.AddRange(categories);
        context.SaveChanges();

        // Generate transactions for the past 3 months
        var random = new Random(42); // Fixed seed for consistent demo data
        var transactions = new List<Transaction>();
        var now = DateTime.Now;
        var startDate = now.AddMonths(-3);

        // Get category IDs
        var groceriesId = categories[0].Id;
        var diningId = categories[1].Id;
        var utilitiesId = categories[2].Id;
        var rentId = categories[3].Id;
        var transportationId = categories[4].Id;
        var entertainmentId = categories[5].Id;
        var shoppingId = categories[6].Id;
        var healthcareId = categories[7].Id;
        var salaryId = categories[8].Id;
        var freelanceId = categories[9].Id;

        // Recurring monthly expenses
        for (var month = 0; month < 3; month++)
        {
            var monthDate = startDate.AddMonths(month);

            // Salary (1st of month)
            transactions.Add(new Transaction
            {
                Title = "Paycheck - TechCorp Inc",
                Amount = 4500.00m,
                Date = new DateTimeOffset(new DateTime(monthDate.Year, monthDate.Month, 1)).ToUnixTimeMilliseconds(),
                AccountId = accounts[0].Id,
                CategoryId = salaryId
            });

            // Rent (1st of month)
            transactions.Add(new Transaction
            {
                Title = "Rent Payment",
                Amount = 1500.00m,
                Date = new DateTimeOffset(new DateTime(monthDate.Year, monthDate.Month, 1)).ToUnixTimeMilliseconds(),
                AccountId = accounts[0].Id,
                CategoryId = rentId
            });

            // Utilities (5th of month)
            transactions.Add(new Transaction
            {
                Title = "Electric Bill",
                Amount = 85.00m + (decimal)(random.NextDouble() * 20),
                Date = new DateTimeOffset(new DateTime(monthDate.Year, monthDate.Month, 5)).ToUnixTimeMilliseconds(),
                AccountId = accounts[0].Id,
                CategoryId = utilitiesId
            });

            transactions.Add(new Transaction
            {
                Title = "Internet Service",
                Amount = 65.00m,
                Date = new DateTimeOffset(new DateTime(monthDate.Year, monthDate.Month, 5)).ToUnixTimeMilliseconds(),
                AccountId = accounts[0].Id,
                CategoryId = utilitiesId
            });

            // Freelance income (mid-month)
            if (month == 1 || month == 2)
            {
                transactions.Add(new Transaction
                {
                    Title = "Freelance Web Design",
                    Amount = 800.00m,
                    Date = new DateTimeOffset(new DateTime(monthDate.Year, monthDate.Month, 15)).ToUnixTimeMilliseconds(),
                    AccountId = accounts[0].Id,
                    CategoryId = freelanceId
                });
            }
        }

        // Generate random daily transactions
        var merchants = new Dictionary<int, string[]>
        {
            { groceriesId, new[] { "Whole Foods", "Trader Joe's", "Safeway", "Target Groceries" } },
            { diningId, new[] { "Chipotle", "Starbucks", "The Local Bistro", "Pizza Place", "Thai Restaurant" } },
            { transportationId, new[] { "Shell Gas Station", "Uber", "Public Transit Pass", "Car Wash" } },
            { entertainmentId, new[] { "Netflix", "Spotify", "Movie Theater", "Concert Tickets", "Gaming Store" } },
            { shoppingId, new[] { "Amazon", "Target", "Best Buy", "Clothing Store", "Home Depot" } },
            { healthcareId, new[] { "CVS Pharmacy", "Doctor Copay", "Dentist", "Health Insurance" } }
        };

        var categoryFrequency = new Dictionary<int, (int min, int max)>
        {
            { groceriesId, (2, 3) },      // 2-3 times per week
            { diningId, (1, 2) },          // 1-2 times per week
            { transportationId, (1, 2) },  // 1-2 times per week
            { entertainmentId, (0, 1) },   // 0-1 times per week
            { shoppingId, (0, 1) },        // 0-1 times per week
            { healthcareId, (0, 0) }       // Occasional
        };

        for (var day = 0; day < 90; day++)
        {
            var currentDate = startDate.AddDays(day);

            foreach (var (categoryId, (minPerWeek, maxPerWeek)) in categoryFrequency)
            {
                // Randomly decide if transaction happens this day based on frequency
                var weeklyChance = (minPerWeek + maxPerWeek) / 2.0;
                var dailyChance = weeklyChance / 7.0;

                if (random.NextDouble() < dailyChance)
                {
                    var merchantList = merchants[categoryId];
                    var merchant = merchantList[random.Next(merchantList.Length)];
                    var baseAmount = categoryId switch
                    {
                        var id when id == groceriesId => 45.0 + random.NextDouble() * 60,
                        var id when id == diningId => 12.0 + random.NextDouble() * 35,
                        var id when id == transportationId => 15.0 + random.NextDouble() * 50,
                        var id when id == entertainmentId => 10.0 + random.NextDouble() * 60,
                        var id when id == shoppingId => 25.0 + random.NextDouble() * 150,
                        var id when id == healthcareId => 20.0 + random.NextDouble() * 100,
                        _ => 10.0
                    };

                    transactions.Add(new Transaction
                    {
                        Title = merchant,
                        Amount = Math.Round((decimal)baseAmount, 2),
                        Date = new DateTimeOffset(currentDate).ToUnixTimeMilliseconds(),
                        AccountId = accounts[random.Next(accounts.Length)].Id,
                        CategoryId = categoryId
                    });
                }
            }

            // Add occasional healthcare transactions
            if (random.NextDouble() < 0.05) // 5% chance per day
            {
                var healthMerchants = merchants[healthcareId];
                transactions.Add(new Transaction
                {
                    Title = healthMerchants[random.Next(healthMerchants.Length)],
                    Amount = Math.Round((decimal)(20.0 + random.NextDouble() * 100), 2),
                    Date = new DateTimeOffset(currentDate).ToUnixTimeMilliseconds(),
                    AccountId = accounts[random.Next(accounts.Length)].Id,
                    CategoryId = healthcareId
                });
            }
        }

        context.Transactions.AddRange(transactions);
        context.SaveChanges();
    }
}
