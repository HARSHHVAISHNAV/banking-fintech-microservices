import db from "../config/db.js";

export const createTransaction = async ({
  transaction_id,
  from_account,
  to_account,
  amount,
  status,
}) => {
  const query = `
    INSERT INTO transactions
    (transaction_id, from_account, to_account, amount, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const values = [
    transaction_id,
    from_account,
    to_account,
    amount,
    status,
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