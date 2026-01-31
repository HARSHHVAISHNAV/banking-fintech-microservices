import express from "express";
import { createAccount } from "../controllers/account.controller.js";

const router = express.Router();

router.post("/", createAccount);

export default router;
