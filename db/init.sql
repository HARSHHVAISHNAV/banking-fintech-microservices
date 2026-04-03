-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  account_id UUID PRIMARY KEY,
  user_id    TEXT NOT NULL,
  balance    NUMERIC NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id  UUID PRIMARY KEY,
  from_account    UUID NOT NULL,
  to_account      UUID NOT NULL,
  amount          NUMERIC NOT NULL,
  status          TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);