import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "transaction-service",
  brokers: ["kafka:9092"],
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

export const producer = kafka.producer();

export const connectProducer = async () => {
  let retries = 5;

  while (retries) {
    try {
      await producer.connect();
      console.log("Kafka connected");
      break;
    } catch (err) {
      console.log("Kafka not ready, retrying...");
      retries--;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};