import express from "express";
import accountRoutes from "./routes/account.routes.js";

const app = express();

app.use(express.json());

app.use("/api/accounts", accountRoutes);

app.get("/health", (req, res) => {
  res.json({ service: "account-service", status: "UP" });
});

export default app;