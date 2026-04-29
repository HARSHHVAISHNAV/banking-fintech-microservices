import express from "express";
import transactionRoutes from "./routes/transaction.routes.js";
import cors from 'cors'


const app = express();

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key'],
}))
app.use("/api/transactions", transactionRoutes);

app.get("/health", (req, res) => {
  res.json({ service: "transaction-service", status: "UP" });
});

export default app;