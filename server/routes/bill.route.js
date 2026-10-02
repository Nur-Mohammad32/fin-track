import express from "express";
import { getBillProviders, payBill } from "../controllers/bill.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";

const router = express.Router();

/*
 * Note: categorizeTransaction middleware is intentionally NOT used here.
 * Bill payments are always categorized as "bills-utilities" on the server.
 */
router.get("/providers", authenticate, getBillProviders);
router.post("/pay", authenticate, payBill);

export default router;
