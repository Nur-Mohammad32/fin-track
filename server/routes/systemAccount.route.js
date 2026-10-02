import express from "express";
import {
    registerSystemAccount,
    loginSystemAccount,
    logoutSystemAccount,
    changeSystemAccountPin,
    deleteSystemAccount
} from "../controllers/systemAccount.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";

const router = express.Router();

router.post("/register", authenticate, authorize("admin"), registerSystemAccount);
router.post("/login", authenticate, authorize("admin"), loginSystemAccount);
router.post("/logout", authenticate, logoutSystemAccount);
router.patch("/change-pin", authenticate, authorize("admin"), changeSystemAccountPin);
router.delete("/delete", authenticate, authorize("admin"), deleteSystemAccount)

export default router;