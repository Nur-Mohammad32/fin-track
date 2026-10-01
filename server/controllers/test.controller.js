
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

export const createTestUsers = async (req, res, next) => {
    try {
        const users = req.body;

        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body must contain an array of users"
            });
        }

        const phones = users.map(user => user.phone);

        const existingUsers = await User.find({
            phone: { $in: phones }
        }).select("phone");

        const existingPhones = new Set(
            existingUsers.map(user => user.phone)
        );

        const seenPhones = new Set();
        const newUsers = [];
        const skippedPhones = [];

        for (const user of users) {
            if (!user.name || !user.phone || !user.pin || !user.accountType) {
                return res.status(400).json({
                    success: false,
                    message: "Name, phone, PIN and account type are required for every user"
                });
            }

            if (!["general", "merchant"].includes(user.accountType)) {
                return res.status(400).json({
                    success: false,
                    message: "Account type must be general or merchant"
                });
            }

            if (
                user.accountType === "merchant" &&
                (!user.businessType || user.businessType.length === 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Business type is required for merchants"
                });
            }

            if (user.accountType === "general") {
                user.businessType = [];
            }

            if (
                existingPhones.has(user.phone) ||
                seenPhones.has(user.phone)
            ) {
                skippedPhones.push(user.phone);
                continue;
            }

            seenPhones.add(user.phone);

            user.pin = await bcrypt.hash(
                user.pin.toString(),
                10
            );

            newUsers.push(user);
        }

        if (newUsers.length === 0) {
            return res.status(200).json({
                success: true,
                message: "All users already exist",
                count: 0,
                skipped: skippedPhones.length,
                skippedPhones
            });
        }

        const createdUsers = await User.insertMany(newUsers);

        const safeUsers = createdUsers.map(user => {
            const userObject = user.toObject();
            delete userObject.pin;
            return userObject;
        });

        res.status(201).json({
            success: true,
            message: "Users created successfully",
            count: createdUsers.length,
            skipped: skippedPhones.length,
            skippedPhones,
            users: safeUsers
        });
    } catch (error) {
        next(error);
    }
};
