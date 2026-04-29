import { Kafka } from "kafkajs";
import db from "../config/db.js";

const kafka = new Kafka({
  clientId: "account-service-consumer",
  brokers:  ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "account-block-group" });

// ─── KAFKA CONNECT ────────────────────────────────────────────────────────────
const connectKafka = async () => {
  let retries = 5;
  while (retries) {
    try {
      await consumer.connect();
      console.log("✅ Kafka connected (account-service consumer)");
      return;
    } catch (err) {
      console.log(`❌ Kafka not ready (account-service), retrying... (${retries} left)`);
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  throw new Error("Kafka connection failed (account-service)");
};

// ─── MAIN CONSUMER ───────────────────────────────────────────────────────────
const runConsumer = async () => {
  await connectKafka();

  // Listens for fraud-service auto-block events
  await consumer.subscribe({ topic: "account-block", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      let data;
      try {
        data = JSON.parse(message.value.toString());
      } catch {
        console.error("❌ Could not parse account-block message");
        return;
      }

      const { account_id, reason } = data;
      if (!account_id) return;

      try {
        await db.query(
          "UPDATE accounts SET status = $1 WHERE account_id = $2",
          ["FROZEN", account_id]
        );
        console.log(`🔒 Account ${account_id} FROZEN by fraud-service | reason: ${reason}`);
      } catch (err) {
        console.error(`❌ Failed to freeze account ${account_id}:`, err.message);
      }
    },
  });
};

runConsumer();