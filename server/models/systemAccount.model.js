import mongoose from "mongoose";

const systemAccountSchema = new mongoose.Schema(
    {
        phone: {
            type: String,
            required: true,
            unique: true
        },

        balance: {
            type: Number,
            required: true,
            min: 0,
            default: 1000000
        },

        pin: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const SystemAccount = mongoose.model("SystemAccount", systemAccountSchema);

export default SystemAccount;