// server/routes/analytics.route.js
import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import { summary } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/summary", authenticate, summary);

export default router;