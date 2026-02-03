import { v4 as uuidv4 } from "uuid";
import { createTransaction } from "../models/transaction.model.js";

export const initiateTransfer = async (req, res) => {
  try {
    const { from_account, to_account, amount } = req.body;

    // Basic validation
    if (!from_account || !to_account || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than zero" });
    }

    if (from_account === to_account) {
      return res
        .status(400)
        .json({ error: "Sender and receiver cannot be the same" });
    }

    const transaction = await createTransaction({
      transaction_id: uuidv4(),
      from_account,
      to_account,
      amount,
      status: "PENDING",
    });

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};