const express = require("express");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    service: "account-service",
    status: "UP",
  });
});

module.exports = app;