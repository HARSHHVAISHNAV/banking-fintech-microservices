import axios from "axios";
import { Kafka } from "kafkajs";
import { updateTransactionStatus } from "../models/transaction.model.js";

const ACCOUNT_SERVICE = "http://account-service:4001/api/accounts";

const kafka = new Kafka({
  clientId: "transaction-service",
  brokers:  ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "transaction-group" });

// ─── KAFKA CONNECT ────────────────────────────────────────────────────────────
const connectKafka = async () => {
  let retries = 5;
  while (retries) {
    try {
      await consumer.connect();
      console.log("✅ Kafka connected (transaction-service)");
      return;
    } catch (err) {
      console.log(`❌ Kafka not ready (transaction-service), retrying... (${retries} left)`);
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  throw new Error("Kafka connection failed");
};

// ─── MAIN CONSUMER ───────────────────────────────────────────────────────────
const runConsumer = async () => {
  await connectKafka();

  await consumer.subscribe({ topic: "transaction-approved", fromBeginning: false });
  await consumer.subscribe({ topic: "transaction-failed",   fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
      } catch {
        console.error("❌ Could not parse Kafka message in transaction-service");
        return;
      }

      const { transaction_id, from_account, to_account, amount, reason, flags } = data;

      // ── APPROVED ────────────────────────────────────────────────────────────
      if (topic === "transaction-approved") {
        console.log(`\n✅ Approved → processing txn ${transaction_id}`);
        if (flags?.length) {
          console.log(`⚠️  Fraud flags on approved txn: [${flags.join(", ")}]`);
        }

        try {
          // Debit sender
          await axios.post(`${ACCOUNT_SERVICE}/debit`, {
            account_id: from_account,
            amount,
          });

          // Credit receiver
          await axios.post(`${ACCOUNT_SERVICE}/credit`, {
            account_id: to_account,
            amount,
          });

          // ✅ FIX: was "SUCCESS" — your DB/frontend expects "APPROVED"
          await updateTransactionStatus(transaction_id, "APPROVED");

          console.log(`💸 Transaction ${transaction_id} → APPROVED`);

        } catch (err) {
          console.error(`❌ Debit/credit failed for txn ${transaction_id}:`, err.message);

          // Mark failed if debit/credit throws (e.g. account service down)
          await updateTransactionStatus(transaction_id, "FAILED").catch(() => {});
        }
      }

      // ── FAILED (fraud blocked) ───────────────────────────────────────────────
      if (topic === "transaction-failed") {
        console.log(`\n🚨 Fraud blocked txn ${transaction_id} | reason: ${reason}`);
        await updateTransactionStatus(transaction_id, "FAILED").catch(() => {});
      }
    },
  });
};

runConsumer();