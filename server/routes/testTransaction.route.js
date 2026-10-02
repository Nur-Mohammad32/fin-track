import express from "express";
import { createTestTransactions } from "../controllers/testTransaction.controller.js";

const router = express.Router();

router.post("/", createTestTransactions);

export default router;