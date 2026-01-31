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
