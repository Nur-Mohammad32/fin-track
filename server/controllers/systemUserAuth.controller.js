import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import SystemUser from "../models/systemUser.model.js";

export const registerSystemUser = async (req, res, next) => {
    try {
        const {
            fullName,
            email,
            password,
            role
        } = req.body;

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, password and role are required"
            });
        }

        if (!["admin", "manager"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
            });
        }

        const existingSystemUser = await SystemUser.findOne({ email });

        if (existingSystemUser) {
            return res.status(409).json({
                success: false,
                message: "System user with this email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const systemUser = await SystemUser.create({
            fullName,
            email,
            password: hashedPassword,
            role
        });

        res.status(201).json({
            success: true,
            message: "System user registered successfully",
            systemUser: {
                id: systemUser._id,
                fullName: systemUser.fullName,
                email: systemUser.email,
                role: systemUser.role
            }
        });
    } catch (error) {
        next(error);
    }
};


export const loginSystemUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const systemUser = await SystemUser.findOne({ email });

        if (!systemUser) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            systemUser.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: systemUser._id,
                role: systemUser.role,
                type: "systemUser"
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
            systemUser: {
                id: systemUser._id,
                fullName: systemUser.fullName,
                email: systemUser.email,
                role: systemUser.role
            }
        });
    } catch (error) {
        next(error);
    }
};


export const logoutSystemUser = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        next(error);
    }
};


export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        const systemUser = await SystemUser.findById(req.user.id);

        if (!systemUser) {
            return res.status(404).json({
                success: false,
                message: "System user not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            currentPassword,
            systemUser.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const hashedNewPassword = await bcrypt.hash(
            newPassword,
            10
        );

        systemUser.password = hashedNewPassword;

        await systemUser.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        next(error);
    }
};