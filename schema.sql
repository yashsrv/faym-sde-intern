-- Custom types.
CREATE TYPE sales_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE transactions_types AS ENUM ('advance_payout', 'final_adjustment', 'withdrawal', 'withdrawal_reversal');
CREATE TYPE transactions_status AS ENUM ('pending', 'success', 'cancelled', 'rejected', 'failed');

-- Tables.

-- users
CREATE TABLE IF NOT EXISTS public.users(
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sales
CREATE TABLE IF NOT EXISTS public.sales(
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(user_id),
    brand VARCHAR(255) NOT NULL,
    status sales_status NOT NULL DEFAULT 'pending',
    earning NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions(
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES public.users(user_id),
    sale_id INT REFERENCES public.sales(id),
    related_transaction_id INT REFERENCES public.transactions(id),
    type transactions_types NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status transactions_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for 1 advance payout per sale
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_advance_per_sale
ON public.transactions (sale_id) WHERE type = 'advance_payout' AND status = 'success';

-- Index for the 24-hour withdrawal check
CREATE INDEX IF NOT EXISTS idx_txn_user_type_time
ON public.transactions (user_id, type, created_at);

CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- Mock data.

-- For user table.
INSERT INTO public.users (user_id, name, email)
VALUES ('john_doe', 'John Doe', 'john@example.com');

-- 3 pending sales, ₹40 each (matches assignment's example exactly)
INSERT INTO public.sales (user_id, brand, status, earning)
VALUES
  ('john_doe', 'brand_1', 'pending', 40),
  ('john_doe', 'brand_1', 'pending', 40),
  ('john_doe', 'brand_1', 'pending', 40);