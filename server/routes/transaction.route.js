import express from "express";
import { createTransaction, getMyTransactions } from "../controllers/transaction.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import {categorizeTransaction} from "../middlewares/categorizeTransaction.middleware.js";

const router = express.Router();

router.post("/", authenticate, categorizeTransaction, createTransaction);
router.get("/", authenticate, getMyTransactions);

export default router;