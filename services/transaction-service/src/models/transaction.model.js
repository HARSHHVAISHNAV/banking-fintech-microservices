import db from "../config/db.js";

export const createTransaction = async ({
  transaction_id,
  from_account,
  to_account,
  amount,
  status,
  idempotency_key,
}) => {
  const query = `
    INSERT INTO transactions
    (transaction_id, from_account, to_account, amount, status, idempotency_key)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    transaction_id,
    from_account,
    to_account,
    amount,
    status,
    idempotency_key,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
};

export const updateTransactionStatus = async (transaction_id, status) => {
  const { rows } = await db.query(
    `UPDATE transactions
     SET status = $1
     WHERE transaction_id = $2
     RETURNING *`,
    [status, transaction_id]
  );

  return rows[0];
};

export const findByIdempotencyKey = async (key) => {
  const { rows } = await db.query(
    "SELECT * FROM transactions WHERE idempotency_key = $1",
    [key]
  );
  return rows[0];
};

// Gets all transactions where account is sender OR receiver
export const getTransactionsByAccount = async (account_id) => {
  const { rows } = await db.query(
    `SELECT * FROM transactions
     WHERE from_account = $1 OR to_account = $1
     ORDER BY created_at DESC`,
    [account_id]
  );
  return rows;
};

// Same but filtered by date range for statements
export const getTransactionsByDateRange = async (account_id, from, to) => {
  const { rows } = await db.query(
    `SELECT * FROM transactions
     WHERE (from_account = $1 OR to_account = $1)
       AND created_at BETWEEN $2 AND $3
     ORDER BY created_at ASC`,
    [account_id, from, to]
  );
  return rows;
};