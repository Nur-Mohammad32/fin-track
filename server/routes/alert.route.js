
import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import { list, read } from "../controllers/alert.controller.js";

const router = express.Router();

router.get("/", authenticate, list);
router.patch("/:id/read", authenticate, read);

export default router;