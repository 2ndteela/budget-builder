# Budget Balancer

Budget tracking application with C# backend and React frontend.

## Prerequisites

- **Node.js & npm**: [Download and install](https://nodejs.org/) (LTS version recommended)
- **.NET SDK 8.0+**: [Download and install](https://dotnet.microsoft.com/download)

Verify installations:
```bash
node --version
npm --version
dotnet --version
```

## Quick Start

Run both server and client with one command:
```bash
./start.sh
```

This builds both projects and starts them on the host network.

## Manual Setup

### Backend (server)

1. Navigate to `server/` directory
2. Install dependencies:
   ```bash
   dotnet restore
   ```
3. Create database:
   ```bash
   dotnet ef database update
   ```
   This creates `db/budget.db` inside the `server/` directory
4. Run server:
   ```bash
   dotnet run
   ```

### Frontend (client)

1. Navigate to `client/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## Database Location

The SQLite database lives in `server/db/`, along with the `-wal`/`-shm` sidecars SQLite creates while a connection is open. The whole directory is gitignored - each user creates their own local database via migrations.

Stop the server with Ctrl-C rather than killing it: shutdown checkpoints the write-ahead log back into `budget.db` and closes the connection pool, which is what lets SQLite delete the sidecar files. They also persist for as long as any other client (e.g. DB Browser for SQLite) holds the database open.
