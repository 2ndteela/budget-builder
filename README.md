# Budget Balancer

Budget tracking application with C# backend and React frontend.

## Setup

### Backend (budget-server)

1. Navigate to `budget-server/` directory
2. Create database:
   ```bash
   dotnet ef database update
   ```
   This creates `db/budget.db` inside the `budget-server/` directory
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

The SQLite database lives in `budget-server/db/`, along with the `-wal`/`-shm` sidecars SQLite creates while a connection is open. The whole directory is gitignored - each user creates their own local database via migrations.

Stop the server with Ctrl-C rather than killing it: shutdown checkpoints the write-ahead log back into `budget.db` and closes the connection pool, which is what lets SQLite delete the sidecar files. They also persist for as long as any other client (e.g. DB Browser for SQLite) holds the database open.
