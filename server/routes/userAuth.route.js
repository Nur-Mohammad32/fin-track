import express from "express";
import authenticate from "../middlewares/authenticate.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    changePin
} from "../controllers/userAuth.controller.js";



const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.patch("/change-pin", authenticate, changePin);

export default router;