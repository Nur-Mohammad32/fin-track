import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";
import {
    registerSystemUser,
    loginSystemUser,
    logoutSystemUser,
    changePassword
} from "../controllers/systemUserAuth.controller.js";



const router = express.Router();

router.post("/register", authenticate, authorize("admin"), registerSystemUser);
router.post("/login", loginSystemUser);
router.post("/logout", logoutSystemUser);
router.patch("/change-password", authenticate, authorize("admin", "manager"), changePassword);

export default router;
