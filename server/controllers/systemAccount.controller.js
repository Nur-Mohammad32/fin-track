import jwt from "jsonwebtoken";
import SystemAccount from "../models/systemAccount.model.js";

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

export const registerSystemAccount = async (req, res, next) => {
    try {
        const { phone, pin, balance } = req.body;

        if (!phone || !pin) {
            return res.status(400).json({
                success: false,
                message: "Phone and PIN are required"
            });
        }

        const existingAccount = await SystemAccount.findOne({ phone });

        if (existingAccount) {
            return res.status(409).json({
                success: false,
                message: "System account already exists"
            });
        }

        const systemAccount = await SystemAccount.create({
            phone,
            pin,
            balance: balance || 0
        });

        const token = generateToken(systemAccount._id);

        return res.status(201).json({
            success: true,
            message: "System account registered successfully",
            token,
            systemAccount: {
                id: systemAccount._id,
                phone: systemAccount.phone,
                balance: systemAccount.balance
            }
        });
    } catch (error) {
        next(error);
    }
};

export const loginSystemAccount = async (req, res, next) => {
    try {
        const { phone, pin } = req.body;

        if (!phone || !pin) {
            return res.status(400).json({
                success: false,
                message: "Phone and PIN are required"
            });
        }

        const systemAccount = await SystemAccount.findOne({ phone });

        if (!systemAccount) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or PIN"
            });
        }

        if (String(systemAccount.pin) !== String(pin)) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or PIN"
            });
        }

        const token = generateToken(systemAccount._id);

        return res.status(200).json({
            success: true,
            message: "System account logged in successfully",
            token,
            systemAccount: {
                id: systemAccount._id,
                phone: systemAccount.phone,
                balance: systemAccount.balance
            }
        });
    } catch (error) {
        next(error);
    }
};

export const logoutSystemAccount = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            message: "System account logged out successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const changeSystemAccountPin = async (req, res, next) => {
    try {
        const { currentPin, newPin } = req.body;

        if (!currentPin || !newPin) {
            return res.status(400).json({
                success: false,
                message: "Current PIN and new PIN are required"
            });
        }

        const systemAccount = await SystemAccount.findById(req.user.id);

        if (!systemAccount) {
            return res.status(404).json({
                success: false,
                message: "System account not found"
            });
        }

        if (String(systemAccount.pin) !== String(currentPin)) {
            return res.status(401).json({
                success: false,
                message: "Current PIN is incorrect"
            });
        }

        systemAccount.pin = newPin;

        await systemAccount.save();

        return res.status(200).json({
            success: true,
            message: "System account PIN changed successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSystemAccount = async (req, res, next) => {
    try {
        const systemAccount = await SystemAccount.findById(req.user.id);

        if (!systemAccount) {
            return res.status(404).json({
                success: false,
                message: "System account not found"
            });
        }

        await SystemAccount.findByIdAndDelete(req.user.id);

        return res.status(200).json({
            success: true,
            message: "System account deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};