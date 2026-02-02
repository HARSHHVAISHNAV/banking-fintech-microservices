import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "transaction-service", status: "UP" });
});

export default app;