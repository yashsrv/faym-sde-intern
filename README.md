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

# Deliverables

## 1. LLD Overview

Layered architecture: App → Routes → Controllers → Services → DB (pg Pool)

## 2. Database Schema

Three tables, under the `public` schema:

- `users`: table for affiliates.
- `sales`: each sale, moves from pending to approved/rejected after reconciliation.
- `transactions`: a ledger. Every advance, adjustment, withdrawal, and reversal is a row here. The balance on users is kept in sync with this table, but the ledger is the actual source of truth.

Key Indexes:

1. Partial unique index `(sale_id) WHERE type='advance_payout' AND status='success'` —> guarantees idempotency, a sale can never be advance-paid twice even if the job reruns.
2. `(user_id, type, created_at)` —> powers the 24h withdrawal cooldown check.
3. `sales(user_id), sales(status)` —> lookup/filter speed.

ER Diagram:

<img width="526" height="964" alt="er-diagram" src="https://github.com/user-attachments/assets/93362e73-967c-4f5e-81ec-4b433705b6d3" />

## 3. API Endpoints

Postman collection:

https://www.postman.com/yashsrv12/workspace/faym/collection/15874956-d5fdbcef-7828-439d-bf3e-777426b5323c?action=share&source=copy-link&creator=15874956

Suggested order:

1. `POST /v1/payouts/advance-payout`: Pay 10% advance on all pending
2. `PATCH /v1/sales/:id/reconcile`: Reconcile pending sale
3. `GET /v1/users/:userId/balance`: Fetch urrent cached balance of a user
4. `POST /v1/withdrawals`: Request withdrawal (debits balance, pending txn)
5. `PATCH /v1/withdrawals/:id/status`: Resolve withdrawal (success/failed/cancelled/rejected) [Withdrawal reversals on status other than success]
6. `GET /v1/users/:userId/transactions`: Fetch all transactions of a user

## Edge Cases & Failure Handling

1. **Double advance payout**: prevented by NOT EXISTS`` subquery + the partial unique index.
2. **Re-reconciling a sale**: blocked by checking `sale.status !== 'pending'` under row lock.
3. **Race conditions**: `SELECT ... FOR UPDATE` on users/sales/transactions before mutating, so two concurrent requests for the same user/sale serialize instead of corrupting balance.
4. **Withdrawal cooldown**: 24h window checked via indexed query before allowing a new withdrawal.
5. **Insufficient balance**: checked before debiting, inside the same lock.
6. **Withdrawal failure/rejection**: auto-generates a `withdrawal_reversal` transaction linked via `related_transaction_id`, credits balance back.
7. **Atomicity**: every multi-step money operation (payout, reconcile, withdraw, reverse) runs in one `BEGIN...COMMIT`, rolled back entirely on any error.

⚠️ Not handled: no auth, no automated tests, no input sanitization beyond basic presence checks, no idempotency key on the API layer itself (relies on DB constraint).
