
import express from "express";

import authenticate from "../middlewares/authenticate.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";

const router = express.Router();

router.get("/me", authenticate);
router.patch("/me", authenticate);
router.get("/", authenticate, authorize("admin"));
router.get("/:id", authenticate, authorize("admin"));
router.delete("/:id", authenticate, authorize("admin"));

export default router;
