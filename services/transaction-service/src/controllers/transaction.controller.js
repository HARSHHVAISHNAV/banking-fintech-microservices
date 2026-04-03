import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  createTransaction,
  updateTransactionStatus,
  findByIdempotencyKey,
  getTransactionsByAccount,
  getTransactionsByDateRange,
} from "../models/transaction.model.js";
import { producer } from "../config/kafka.js";

// const ACCOUNT_SERVICE = "http://account-service:4001/api/accounts";
// const FRAUD_SERVICE = "http://fraud-service:4003/api/fraud";
// const NOTIFICATION_SERVICE = "http://notification-service:4004/api/notifications";

export const initiateTransfer = async (req, res) => {
  const { from_account, to_account, amount } = req.body;

  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency-Key header required" });
  }

  const existingTxn = await findByIdempotencyKey(idempotencyKey);
  if (existingTxn) {
    return res.json(existingTxn);
  }

  try {
    const transaction = await createTransaction({
      transaction_id: uuidv4(),
      from_account,
      to_account,
      amount,
      status: "PENDING",
      idempotency_key: idempotencyKey,
    });

    // 🔥 ONLY publish event
    await producer.send({
      topic: "transaction-created",
      messages: [{
        value: JSON.stringify({
          transaction_id: transaction.transaction_id,
          from_account,
          to_account,
          amount,
        }),
      }],
    });

    console.log("📤 Event sent to Kafka");

    return res.json({
      message: "Transaction initiated",
      transaction_id: transaction.transaction_id,
    });

  } catch (error) {
    return res.status(500).json({
      error: "Transaction initiation failed",
    });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { account_id } = req.params;
    const transactions = await getTransactionsByAccount(account_id);
    res.json({ account_id, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStatement = async (req, res) => {
  try {
    const { account_id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: "from and to query params required" });
    }

    // Fetch account's current balance from account-service
    const accountRes = await axios.get(
      `http://account-service:4001/api/accounts/${account_id}`
    );
    const currentBalance = parseFloat(accountRes.data.balance);

    const transactions = await getTransactionsByDateRange(account_id, from, to);

    // Calculate running balance — work backwards from current balance
    // This is a common pattern called "reverse ledger reconstruction"
    let runningBalance = currentBalance;
    const ledger = [...transactions].reverse().map((txn) => {
      const isSender = txn.from_account === account_id;
      const entry = {
        ...txn,
        direction: isSender ? "DEBIT" : "CREDIT",
        balance_after: runningBalance,
      };
      // Undo this transaction to get balance before it
      runningBalance = isSender
        ? runningBalance + parseFloat(txn.amount)
        : runningBalance - parseFloat(txn.amount);
      return entry;
    }).reverse();

    res.json({ account_id, from, to, statement: ledger });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};