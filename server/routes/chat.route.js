import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import { chat } from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/", authenticate, chat);

export default router;
