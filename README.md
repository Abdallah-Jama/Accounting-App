# Local Ledger

A local-first accounting and analytics app for tracking money received from companies and the invoices sent to them. The app uses Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite. Accounting data stays on the Windows PC and is never stored in browser `localStorage`.

## Accounting rules

- Money is stored in integer minor units (fils), never floating-point values.
- A receipt increases a company's money in hand.
- Draft and Final invoice grand totals decrease a company's money in hand.
- Cancelled invoices remain in history and do not affect balances.
- `money in hand = total received - grand totals of non-cancelled invoices`
- The server recalculates invoice line totals, subtotal, and grand total before saving.

## Run locally on Windows

Install [Node.js](https://nodejs.org/) (version 20 or newer), then open PowerShell in this folder.

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). On systems that allow PowerShell scripts, `npm` can be used instead of `npm.cmd`.

## Production mode

```powershell
npm.cmd run build
npm.cmd start
```

## Local data and backups

The SQLite file is `prisma/accounting.db`. Stop the app before copying the database file for backup. To restore, stop the app and replace that file with the backup.

The Settings & Data page can create timestamped database copies in `backups/` without overwriting existing files. It also exports companies, received payments, invoices, and invoice items as CSV.

The `.env` file controls the database location:

```dotenv
DATABASE_URL="file:./accounting.db"
```

Prisma resolves this path relative to `prisma/schema.prisma`, so the database is created inside the `prisma` directory.

## Useful commands

```powershell
npm.cmd run typecheck   # TypeScript validation
npm.cmd run test:accounting # Balance, cancellation, and backup smoke checks
npm.cmd run db:studio   # Local database browser
npm.cmd run db:push     # Apply schema changes locally
```

## Pages

- Dashboard: totals, balances, and recent activity
- Companies: company CRUD and per-company ledger detail
- Received Money: receipt register
- Invoices: editable drafts, immutable final invoices, cancellation history, and printable invoice/PDF view
- Analytics: received and invoiced comparison
- Settings & Data: real local backups and four CSV exports
