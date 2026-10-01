import express from "express";
import { createTestUsers } from "../controllers/test.controller.js";

const router = express.Router();

router.post("/", createTestUsers);

export default router;