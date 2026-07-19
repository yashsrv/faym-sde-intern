# Faym — User Payout Management System

A payout system for affiliate sales. Handles advance payouts, reconciliation, withdrawals, and recovering failed payouts.

## Stack

Node.js, Express, PostgreSQL 17, Docker

## Setup

Clone the repo, create a `.env` file in the root:

```
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_password
POSTGRES_DB=faym
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
PORT=3000
HOST=0.0.0.0
```

Then:

```bash
docker compose up -d --build
```

This starts the api (on `http://localhost:3000`) and postgres containers. Schema and seed data load automatically on first boot.

Check it worked:

```bash
curl http://localhost:3000/v1/users/john_doe/balance
```

```json
{ "userId": "john_doe", "balance": "0.00" }
```

To reset and start clean:

```bash
docker compose down -v
docker compose up -d --build
```

## Seed data

One user (`john_doe`) with 3 pending sales, brand `brand_1`, ₹40 each. Same numbers as the assignment PDF's example.

## Schema

Three tables, under the `faym` schema:

- `users`: the affiliate, plus a cached balance
- `sales`: each sale, moves from pending to approved/rejected
- `transactions`: a ledger. Every advance, adjustment, withdrawal, and reversal is a row here. The balance on users is kept in sync with this table, but the ledger is the actual source of truth.

A partial unique index makes sure a sale can never get advance paid twice, even if the job runs more than once. Withdrawal reversals link back to the original withdrawal so you can trace why a balance changed. Money operations run inside a single DB transaction so they can't half complete. Row locking is used to stop two requests racing each other.

## Testing

Postman collection:

https://www.postman.com/yashsrv12/workspace/faym/collection/15874956-d5fdbcef-7828-439d-bf3e-777426b5323c?action=share&source=copy-link&creator=15874956

Suggested order:

1. `POST /v1/payouts/advance-payout`
2. `PATCH /v1/sales/:id/reconcile` (reconcile all 3 seeded sales, 1 rejected, 2 approved)
3. `GET /v1/users/:userId/balance`
4. `POST /v1/withdrawals`
5. `PATCH /v1/withdrawals/:id/status` (mark it failed, check the amount comes back)
6. `GET /v1/users/:userId/transactions`

## Notes

No auth on the endpoints since this is just for review. No automated tests, tested manually through Postman. Balance can be recomputed from the ledger if it ever drifts, but there's no job doing that automatically. Would use a real migration tool instead of one schema.sql file for a production system.
