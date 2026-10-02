
import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import { create, preview, progress } from "../controllers/budget.controller.js";

const router = express.Router();

router.post("/", authenticate, create);
router.post("/preview", authenticate, preview);
router.get("/", authenticate, progress);

export default router;
