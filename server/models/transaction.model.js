import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String,
            unique: true,
            required: true
        },

        from: {
            type: String,
            required: true
        },

        to: {
            type: String,
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["success", "failed"],
            required: true
        },

        failReason: {
            type: String,
            enum: [
                "Insufficient balance",
                "Incorrect PIN",
                "Invalid recipient number",
                "Transaction limit exceeded",
                "Account blocked/suspended",
                "Network/connectivity failure",
                "Server/service unavailable",
                "Transaction timeout",
                "Security/fraud check failure",
                "KYC/account verification issue"
            ],
            default: null
        },

        transactionType: {
            type: String,
            enum: ["send_money", "cash_in", "cash_out", "payment", "transfer"],
            required: true
        },

        category: {
            type: String,
            enum: [
                "food-dining",
                "bills-utilities",
                "housing",
                "transportation",
                "shopping",
                "healthcare",
                "education",
                "entertainment",
                "communication",
                "personal-care",
                "financial",
                "family-social",
                "donation",
                "other"
            ],
            default: "Other"
        },

        reference: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;