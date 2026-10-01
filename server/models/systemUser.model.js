import mongoose from "mongoose";

const SystemUserSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["admin", "manager"],
            required: true
        }
    },
    {
        timestamps: true
    }
);

const SystemUser = mongoose.model("SystemUser", SystemUserSchema);

export default SystemUser;