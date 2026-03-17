import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  createTransaction,
  updateTransactionStatus,
  findByIdempotencyKey,
} from "../models/transaction.model.js";


const ACCOUNT_SERVICE = "http://localhost:4001/api/accounts";
const FRAUD_SERVICE = "http://localhost:4003/api/fraud";
const NOTIFICATION_SERVICE = "http://localhost:4004/api/notifications";

export const initiateTransfer = async (req, res) => {
  const { from_account, to_account, amount } = req.body;

  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) {
    return res.status(400).json({ error: "Idempotency-Key header required" });
  }

  // Check if request already processed
  const existingTxn = await findByIdempotencyKey(idempotencyKey);
  if (existingTxn) {
    console.log("Duplicate request detected");
    return res.json(existingTxn);
  }
  let transaction;

  try {
    // Create transaction → PENDING
    transaction = await createTransaction({
      transaction_id: uuidv4(),
      from_account,
      to_account,
      amount,
      status: "PENDING",
      idempotency_key: idempotencyKey,
    });
    console.log("Running fraud check...");

    const fraudResponse = await axios.post(`${FRAUD_SERVICE}/check`, {
      from_account,
      to_account,
      amount,
    });

    if (!fraudResponse.data.approved) {
      console.log("Fraud detected ");

      await updateTransactionStatus(transaction.transaction_id, "FAILED");

      await axios.post(`${NOTIFICATION_SERVICE}/send`, {
        account_id: from_account,
        type: "TRANSFER_BLOCKED",
        message: `Transfer blocked: ${fraudResponse.data.reason}`,
      });

      return res.status(400).json({
        error: "Transaction blocked by fraud detection",
        reason: fraudResponse.data.reason,
      });
    }

    console.log("Fraud check passed ");

    console.log("Transaction created:", transaction.transaction_id);

    // DEBIT sender
    console.log("Debiting sender...");
    await axios.post(`${ACCOUNT_SERVICE}/debit`, {
      account_id: from_account,
      amount,
    });

    console.log("Debit successful");

    // CREDIT receiver
    console.log("Crediting receiver...");
    await axios.post(`${ACCOUNT_SERVICE}/credit`, {
      account_id: to_account,
      amount,
    });

    console.log("Credit successful");

    // Mark SUCCESS
    const successTxn = await updateTransactionStatus(
      transaction.transaction_id,
      "SUCCESS"
    );
    // Notify sender
    await axios.post(`${NOTIFICATION_SERVICE}/send`, {
      account_id: from_account,
      type: "TRANSFER_SUCCESS",
      message: `₹${amount} debited successfully`,
    });

    // Notify receiver
    await axios.post(`${NOTIFICATION_SERVICE}/send`, {
      account_id: to_account,
      type: "TRANSFER_RECEIVED",
      message: `₹${amount} received from account ${from_account}`,
    });
    return res.json(successTxn);

  } catch (error) {
    console.log("Transfer failed ");

    // COMPENSATION STEP (Refund sender if debit happened)
    try {
      if (transaction) {
        console.log("Refunding sender (compensation)...");
        await axios.post(`${ACCOUNT_SERVICE}/credit`, {
          account_id: from_account,
          amount,
        });
        console.log("Refund completed");
      }
    } catch (refundError) {
      console.log("Refund FAILED — manual intervention required ");
    }

    // Mark transaction FAILED
    if (transaction) {
      await updateTransactionStatus(transaction.transaction_id, "FAILED");
    }
    await axios.post(`${NOTIFICATION_SERVICE}/send`, {
      account_id: from_account,
      type: "TRANSFER_FAILED",
      message: "Transfer failed and money was refunded",
    });

    return res.status(500).json({
      error: "Transaction failed and was rolled back",
    });
  }
};
