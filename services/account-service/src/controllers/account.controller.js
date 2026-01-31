import { v4 as uuidv4 } from "uuid";
import { createAccount as createAccountModel } from "../models/account.model.js";

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