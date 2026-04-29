import express from "express";
import accountRoutes from "./routes/account.routes.js";
import cors from 'cors'



const app = express();

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:80'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key'],
}))
app.use("/api/accounts", accountRoutes);

app.get("/health", (req, res) => {
  res.json({ service: "account-service", status: "UP" });
});

export default app;