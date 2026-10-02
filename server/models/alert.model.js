
import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, index: true },
        type: {
            type: String,
            enum: [
                "large_amount",
                "new_recipient",
                "odd_hour",
                "rapid_transactions"
            ],
            required: true
        },
        severity: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },
        message: { type: String, required: true },
        transactionId: { type: String },
        read: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export default mongoose.model("Alert", alertSchema);