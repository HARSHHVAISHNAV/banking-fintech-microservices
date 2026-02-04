import db from "../config/db.js";

export const createAccount = async ({ account_id, user_id }) => {
  const query = `
    INSERT INTO accounts (account_id, user_id, balance, status)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const values = [account_id, user_id, 0, "ACTIVE"];
  const { rows } = await db.query(query, values);

  return rows[0];
};
export const debitAccount = async (account_id, amount) => {
  const query = `
    UPDATE accounts
    SET balance = balance - $1
    WHERE account_id = $2
      AND balance >= $1
      AND status = 'ACTIVE'
    RETURNING *
  `;

  const { rows } = await db.query(query, [amount, account_id]);
  return rows[0]; // undefined if debit failed
};

export const creditAccount = async (account_id, amount) => {
  const query = `
    UPDATE accounts
    SET balance = balance + $1
    WHERE account_id = $2
      AND status = 'ACTIVE'
    RETURNING *
  `;

  const { rows } = await db.query(query, [amount, account_id]);
  return rows[0];
};

export const getAccountById = async (account_id) => {
  const { rows } = await db.query(
    "SELECT * FROM accounts WHERE account_id = $1",
    [account_id]
  );

  return rows[0];
};
