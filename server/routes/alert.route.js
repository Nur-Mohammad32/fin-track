
import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import { list, read, respond, followUp } from "../controllers/alert.controller.js";

const router = express.Router();

router.get("/", authenticate, list);
router.patch("/:id/read", authenticate, read);
router.patch("/:id/respond", authenticate, respond);
router.patch("/:id/follow-up", authenticate, followUp);

export default router;