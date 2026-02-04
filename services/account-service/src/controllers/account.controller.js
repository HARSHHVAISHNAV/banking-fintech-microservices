import { v4 as uuidv4 } from "uuid";
import { createAccount as createAccountModel } from "../models/account.model.js";
import { debitAccount, creditAccount, getAccountById } from "../models/account.model.js";
// Controller to create a new account
export const createAccount = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const account = await createAccountModel({
      account_id: uuidv4(),
      user_id,
    });

    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Controller to debit an account
export const debit = async (req, res) => {
  try {
    const { account_id, amount } = req.body;

    const account = await debitAccount(account_id, amount);

    if (!account) {
      return res.status(400).json({ error: "Debit failed" });
    }

    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Controller to credit an account
export const credit = async (req, res) => {
  try {
    const { account_id, amount } = req.body;

    const account = await creditAccount(account_id, amount);

    if (!account) {
      return res.status(400).json({ error: "Credit failed" });
    }

    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Controller to get account details by ID
export const getAccount = async (req, res) => {
  try {
    const { account_id } = req.params;

    const account = await getAccountById(account_id);

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};