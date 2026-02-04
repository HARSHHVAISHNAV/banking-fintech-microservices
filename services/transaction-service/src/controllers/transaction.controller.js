import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  createTransaction,
  updateTransactionStatus,
} from "../models/transaction.model.js";

const ACCOUNT_SERVICE_URL = "http://localhost:4001/api/accounts";

export const initiateTransfer = async (req, res) => {
  const { from_account, to_account, amount } = req.body;

  try {
    //  Create PENDING transaction
    const transaction = await createTransaction({
      transaction_id: uuidv4(),
      from_account,
      to_account,
      amount,
      status: "PENDING",
    });

    //  Debit sender
    await axios.post(`${ACCOUNT_SERVICE_URL}/debit`, {
      account_id: from_account,
      amount,
    });

    // Credit receiver
    await axios.post(`${ACCOUNT_SERVICE_URL}/credit`, {
      account_id: to_account,
      amount,
    });

    // Mark SUCCESS
    const successTxn = await updateTransactionStatus(
      transaction.transaction_id,
      "SUCCESS"
    );

    res.status(200).json(successTxn);
  } catch (err) {
    //  Mark FAILED
    if (err?.response) {
      // account service rejected
    }

    res.status(500).json({ error: "Transaction failed" });
  }
};