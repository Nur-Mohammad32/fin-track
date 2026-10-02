import express from "express";
import { createTransaction } from "../controllers/transaction.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import {categorizeTransaction} from "../middlewares/categorizeTransaction.middleware.js";

const router = express.Router();

router.post("/", authenticate, categorizeTransaction, createTransaction);

export default router;