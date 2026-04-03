import axios from "axios";
import { Kafka } from "kafkajs";
import { updateTransactionStatus } from "../models/transaction.model.js";

const connectKafka = async () => {
  let retries = 5;

  while (retries) {
    try {
      await consumer.connect();
      console.log("✅ Kafka connected (transaction-service)");
      return;
    } catch (err) {
      console.log("❌ Kafka not ready (transaction-service), retrying...");
      retries--;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  throw new Error("Kafka connection failed");
};

const ACCOUNT_SERVICE = "http://account-service:4001/api/accounts";

const kafka = new Kafka({
  clientId: "transaction-service",
  brokers: ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "transaction-group" });

const runConsumer = async () => {
  await connectKafka();

  await consumer.subscribe({ topic: "transaction-approved" });
  await consumer.subscribe({ topic: "transaction-failed" });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value.toString());

      const transaction_id = data.transaction_id;
      const from_account = data.from_account;
      const to_account = data.to_account;
      const amount = data.amount;

      if (topic === "transaction-approved") {
        console.log("✅ Approved → processing");

        try {
          await axios.post(`${ACCOUNT_SERVICE}/debit`, {
            account_id: from_account,
            amount,
          });

          await axios.post(`${ACCOUNT_SERVICE}/credit`, {
            account_id: to_account,
            amount,
          });

          await updateTransactionStatus(transaction_id, "SUCCESS");

          console.log("💸 Transaction SUCCESS");
        } catch (err) {
          console.log("❌ Error during debit/credit");

          await updateTransactionStatus(transaction_id, "FAILED");
        }
      }

      if (topic === "transaction-failed") {
        console.log("🚨 Fraud detected → marking FAILED");

        await updateTransactionStatus(transaction_id, "FAILED");
      }
    },
  });
};

runConsumer();
