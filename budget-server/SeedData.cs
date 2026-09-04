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
        context.MonthlyBudgets.RemoveRange(context.MonthlyBudgets);
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

        var groceries = categories[0];
        var dining = categories[1];
        var utilities = categories[2];
        var rent = categories[3];
        var transportation = categories[4];
        var entertainment = categories[5];
        var shopping = categories[6];
        var healthcare = categories[7];
        var salary = categories[8];
        var freelance = categories[9];

        // A projected expense now belongs to one month, so every month gets its own
        // copy of the recurring plan.
        var monthlyPlan = new (Category Category, string Name, decimal Value)[]
        {
            (salary, "Paycheck - TechCorp Inc", 4500.00m),
            (freelance, "Freelance Web Design", 800.00m),
            (rent, "Rent Payment", 1500.00m),
            (utilities, "Electric Bill", 95.00m),
            (utilities, "Internet Service", 65.00m),
            (groceries, "Groceries", 600.00m),
            (dining, "Dining Out", 250.00m),
            (transportation, "Transportation", 200.00m),
            (entertainment, "Entertainment", 100.00m),
            (shopping, "Shopping", 200.00m),
            (healthcare, "Healthcare", 100.00m)
        };

        var random = new Random(42); // Fixed seed for consistent demo data
        var now = DateTime.Now;
        var firstMonth = new DateTime(now.Year, now.Month, 1).AddMonths(-2);

        // Seed the last three months, current month included
        for (var monthOffset = 0; monthOffset < 3; monthOffset++)
        {
            var monthDate = firstMonth.AddMonths(monthOffset);
            var isCurrentMonth = monthDate.Year == now.Year && monthDate.Month == now.Month;
            var lastDay = isCurrentMonth ? now.Day : DateTime.DaysInMonth(monthDate.Year, monthDate.Month);

            var budget = new MonthlyBudget { Year = monthDate.Year, Month = monthDate.Month };
            context.MonthlyBudgets.Add(budget);
            context.SaveChanges();

            var expenses = monthlyPlan
                .Select(plan => new ProjectedExpense
                {
                    Name = plan.Name,
                    Value = plan.Value,
                    CategoryId = plan.Category.Id,
                    MonthlyBudgetId = budget.Id
                })
                .ToList();
            context.ProjectedExpenses.AddRange(expenses);
            context.SaveChanges();

            var expenseByName = expenses.ToDictionary(e => e.Name, e => e);
            var transactions = new List<Transaction>();

            void AddTransaction(string title, decimal amount, int day, string projectedExpenseName)
            {
                if (day > lastDay) return;

                transactions.Add(new Transaction
                {
                    Title = title,
                    Amount = amount,
                    Date = day,
                    AccountId = accounts[random.Next(accounts.Length)].Id,
                    MonthlyBudgetId = budget.Id,
                    ProjectedExpenseId = expenseByName[projectedExpenseName].Id
                });
            }

            // Recurring transactions
            AddTransaction("Paycheck - TechCorp Inc", 4500.00m, 1, "Paycheck - TechCorp Inc");
            AddTransaction("Rent Payment", 1500.00m, 1, "Rent Payment");
            AddTransaction("Electric Bill", 85.00m + (decimal)(random.NextDouble() * 20), 5, "Electric Bill");
            AddTransaction("Internet Service", 65.00m, 5, "Internet Service");

            if (monthOffset > 0)
            {
                AddTransaction("Freelance Web Design", 800.00m, 15, "Freelance Web Design");
            }

            // Random day to day spending, matched to the month's projected expense
            var merchants = new Dictionary<string, string[]>
            {
                { "Groceries", new[] { "Whole Foods", "Trader Joe's", "Safeway", "Target Groceries" } },
                { "Dining Out", new[] { "Chipotle", "Starbucks", "The Local Bistro", "Pizza Place", "Thai Restaurant" } },
                { "Transportation", new[] { "Shell Gas Station", "Uber", "Public Transit Pass", "Car Wash" } },
                { "Entertainment", new[] { "Netflix", "Spotify", "Movie Theater", "Concert Tickets", "Gaming Store" } },
                { "Shopping", new[] { "Amazon", "Target", "Best Buy", "Clothing Store", "Home Depot" } },
                { "Healthcare", new[] { "CVS Pharmacy", "Doctor Copay", "Dentist", "Health Insurance" } }
            };

            var weeklyFrequency = new Dictionary<string, double>
            {
                { "Groceries", 2.5 },
                { "Dining Out", 1.5 },
                { "Transportation", 1.5 },
                { "Entertainment", 0.5 },
                { "Shopping", 0.5 },
                { "Healthcare", 0.25 }
            };

            var amountRanges = new Dictionary<string, (double min, double spread)>
            {
                { "Groceries", (45.0, 60.0) },
                { "Dining Out", (12.0, 35.0) },
                { "Transportation", (15.0, 50.0) },
                { "Entertainment", (10.0, 60.0) },
                { "Shopping", (25.0, 150.0) },
                { "Healthcare", (20.0, 100.0) }
            };

            for (var day = 1; day <= lastDay; day++)
            {
                foreach (var (expenseName, perWeek) in weeklyFrequency)
                {
                    if (random.NextDouble() >= perWeek / 7.0) continue;

                    var merchantList = merchants[expenseName];
                    var (min, spread) = amountRanges[expenseName];

                    AddTransaction(
                        merchantList[random.Next(merchantList.Length)],
                        Math.Round((decimal)(min + random.NextDouble() * spread), 2),
                        day,
                        expenseName
                    );
                }
            }

            context.Transactions.AddRange(transactions);
            context.SaveChanges();
        }
    }
}
