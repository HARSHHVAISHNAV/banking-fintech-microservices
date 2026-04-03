import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "fraud-service",
  brokers: ["kafka:9092"],
});

export const consumer = kafka.consumer({ groupId: "fraud-group" });
export const producer = kafka.producer();