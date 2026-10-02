import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const registerUser = async (req, res, next) => {
    try {
        const {
            name,
            phone,
            pin,
            currentBalance,
            accountType,
            businessType
        } = req.body;

        if (!name || !phone || !pin || !accountType) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, PIN and account type are required"
            });
        }

        if (!["general", "merchant"].includes(accountType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account type"
            });
        }

        if (
            accountType === "merchant" &&
            (!businessType || businessType.length === 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Business type is required for merchants"
            });
        }

        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User with this phone number already exists"
            });
        }

        const hashedPin = await bcrypt.hash(pin.toString(), 10);

        const user = await User.create({
            name,
            phone,
            pin: hashedPin,
            currentBalance: currentBalance ?? 0,
            accountType,
            businessType: accountType === "merchant" ? businessType : []
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                currentBalance: user.currentBalance,
                accountType: user.accountType,
                businessType: user.businessType
            }
        });
    } catch (error) {
        next(error);
    }
};


export const loginUser = async (req, res, next) => {
    try {
        const { phone, pin } = req.body;

        if (!phone || !pin) {
            return res.status(400).json({
                success: false,
                message: "Phone and PIN are required"
            });
        }

        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or PIN"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        const isPinValid = await bcrypt.compare(
            pin.toString(),
            user.pin
        );

        if (!isPinValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or PIN"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                accountType: user.accountType,
                type: "user"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                accountType: user.accountType,
                businessType: user.businessType
            }
        });
    } catch (error) {
        next(error);
    }
};


export const logoutUser = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        next(error);
    }
};


export const changePin = async (req, res, next) => {
    try {
        const { currentPin, newPin } = req.body;

        if (!currentPin || !newPin) {
            return res.status(400).json({
                success: false,
                message: "Current PIN and new PIN are required"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const isPinValid = await bcrypt.compare(
            currentPin.toString(),
            user.pin
        );

        if (!isPinValid) {
            return res.status(401).json({
                success: false,
                message: "Current PIN is incorrect"
            });
        }

        const hashedNewPin = await bcrypt.hash(
            newPin.toString(),
            10
        );

        user.pin = hashedNewPin;

        await user.save();

        res.status(200).json({
            success: true,
            message: "PIN changed successfully"
        });
    } catch (error) {
        next(error);
    }
};
