import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import {
    list,
    generate,
    read
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", authenticate, list);
router.post("/generate", authenticate, generate);
router.patch("/:id/read", authenticate, read);

export default router;
