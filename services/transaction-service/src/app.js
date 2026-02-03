import express from "express";
import transactionRoutes from "./routes/transaction.routes.js";

const app = express();
app.use(express.json());

app.use("/api/transactions", transactionRoutes);

app.get("/health", (req, res) => {
  res.json({ service: "transaction-service", status: "UP" });
});

export default app;