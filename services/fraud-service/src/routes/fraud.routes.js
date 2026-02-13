import express from "express";
import { checkFraud } from "../controllers/fraud.controller.js";

const router = express.Router();

router.post("/check", checkFraud);

export default router;