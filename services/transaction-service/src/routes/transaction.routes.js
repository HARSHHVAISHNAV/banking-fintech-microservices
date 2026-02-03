import express from "express";
import { initiateTransfer } from "../controllers/transaction.controller.js";

const router = express.Router();

router.post("/transfer", initiateTransfer);

export default router;