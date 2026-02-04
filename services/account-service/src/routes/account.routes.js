import express from "express";
import { createAccount } from "../controllers/account.controller.js";
import { debit } from "../controllers/account.controller.js";
import { credit } from "../controllers/account.controller.js";
import { getAccount } from "../controllers/account.controller.js";

const router = express.Router();

router.get("/:account_id", getAccount);

router.post("/debit", debit);
router.post("/credit", credit);
router.post("/", createAccount);

export default router;
