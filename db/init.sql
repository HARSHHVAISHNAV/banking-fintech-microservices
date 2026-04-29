-- Users table
CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  mobile        TEXT UNIQUE,
  role          TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  account_id UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  balance    NUMERIC NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'ACTIVE',
  upi_id     TEXT UNIQUE,
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

-- ─── SEED ADMIN ───────────────────────────────────────────────────────────────
-- password: Admin@123  (bcrypt hash, cost=10)
INSERT INTO users (user_id, name, email, password_hash, mobile, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  'admin@nexbank.com',
  '$2b$10$TJ6crMvdGV/mI5snnaxmWu1BCJVW7l3fl9NoNZ0coPFpIsvkMD9Vu',
  '0000000000',
  'admin'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role          = EXCLUDED.role;