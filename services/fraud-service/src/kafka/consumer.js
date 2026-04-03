import { consumer, producer } from "../config/kafka.js";

const connectKafka = async () => {
  let retries = 5;

  while (retries) {
    try {
      await consumer.connect();
      await producer.connect();
      console.log("✅ Kafka connected (fraud-service)");
      return;
    } catch (err) {
      console.log("❌ Kafka not ready (fraud-service), retrying...");
      retries--;
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  throw new Error("Kafka connection failed after retries");
};

const runConsumer = async () => {
  await connectKafka();

  await consumer.subscribe({
    topic: "transaction-created",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());

      const transaction_id = data.transaction_id;
      const from_account = data.from_account;
      const to_account = data.to_account;
      const amount = Number(data.amount);

      console.log("Received transaction:", data);

      // SAME LOGIC YOU ALREADY WROTE

      if (from_account === to_account) {
        await producer.send({
          topic: "transaction-approved",
          messages: [
            {
              value: JSON.stringify({
                transaction_id,
                from_account,
                to_account,
                amount,
              }),
            },
          ],
        });
        return;
      }

      if (amount > 100000) {
        console.log("🚨 Fraud detected!");

        // Block account
        await producer.send({
          topic: "account-block",
          messages: [
            {
              value: JSON.stringify({
                account_id: from_account,
              }),
            },
          ],
        });

        await producer.send({
          topic: "transaction-failed",
          messages: [
            {
              value: JSON.stringify({
                transaction_id,
                from_account,
                to_account,
                amount,
                reason: "Amount exceeds safe threshold",
              }),
            },
          ],
        });

        return;
      }

      if (amount <= 0) {
        await producer.send({
          topic: "transaction-failed",
          messages: [
            {
              value: JSON.stringify({
                transaction_id,
                reason: "Invalid amount",
              }),
            },
          ],
        });
        return;
      }

      // APPROVED
      await producer.send({
        topic: "transaction-approved",
        messages: [
          {
            value: JSON.stringify({
              transaction_id,
              from_account: data.from_account, // ✅ pass original string UUIDs
              to_account: data.to_account,
              amount: data.amount,
            }),
          },
        ],
      });

      console.log("Transaction approved");
    },
  });
};

runConsumer();
