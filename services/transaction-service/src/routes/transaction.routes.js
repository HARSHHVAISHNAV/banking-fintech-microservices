import express from "express";
import {
  initiateTransfer,
  getHistory,
  getStatement,
} from "../controllers/transaction.controller.js";
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router();

router.post("/transfer", requireAuth, initiateTransfer);
router.get("/history/:account_id", requireAuth, getHistory);
router.get("/statement/:account_id", requireAuth, getStatement);

export default router;