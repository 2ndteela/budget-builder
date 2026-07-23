# Budget Balancer

Budget tracking application with C# backend and React frontend.

## Setup

### Backend (budget-server)

1. Navigate to `budget-server/` directory
2. Create database:
   ```bash
   dotnet ef database update
   ```
   This creates `budget.db` in the `budget-server/` directory
3. Run server:
   ```bash
   dotnet run
   ```

### Frontend (react)

1. Navigate to `react/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## Database Location

The SQLite database file (`budget.db`) is created in the `budget-server/` directory. It's gitignored - each user creates their own local database via migrations.
