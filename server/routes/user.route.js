import express from "express";

import authenticate from "../middlewares/authenticate.middleware.js";
import authorize from "../middlewares/authorize.middleware.js";

import {
    getMyProfile,
    updateMyProfile,
    getAllUsers,
    getUserById,
    deleteUserById
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, updateMyProfile);
router.get("/", authenticate, authorize("admin", "manager"), getAllUsers);
router.get("/:id", authenticate, authorize("admin", "manager"), getUserById);
router.delete("/:id", authenticate, authorize("admin"), deleteUserById);

export default router;