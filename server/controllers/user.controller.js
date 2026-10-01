
import User from "../models/user.model.js";

export const getMyProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select("-pin");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};


export const updateMyProfile = async (req, res, next) => {
    try {
        const { name, businessType } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (name !== undefined) {
            user.name = name;
        }

        if (user.accountType === "merchant" && businessType !== undefined) {
            user.businessType = businessType;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                accountType: user.accountType,
                businessType: user.businessType,
                currentBalance: user.currentBalance,
                isActive: user.isActive
            }
        });
    } catch (error) {
        next(error);
    }
};


export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select("-pin");

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(error);
    }
};


export const getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select("-pin");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};


export const deleteUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
