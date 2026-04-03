import express from "express";
import {
  initiateTransfer,
  getHistory,    // ← add
  getStatement,  // ← add
} from "../controllers/transaction.controller.js";

const router = express.Router();

router.post("/transfer", initiateTransfer);
router.get("/history/:account_id", getHistory);
router.get("/statement/:account_id", getStatement);

export default router;