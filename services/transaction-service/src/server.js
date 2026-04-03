import "dotenv/config";
import app from "./app.js";
import { connectProducer } from "./config/kafka.js";
import "./kafka/consumer.js";

const PORT = process.env.PORT || 4002;
await connectProducer();
console.log("Kafka Producer connected");

app.listen(PORT, () => {
  console.log(`Transaction Service running on port ${PORT}`);
});
