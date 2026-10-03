
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
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        displayType: {
            type: String,
            enum: ["red_alert", "notification"],
            required: true
        },
        message: { type: String, required: true },
        transactionId: { type: String },
        read: { type: Boolean, default: false },

        // The user's answer to "Was this you?"
        userResponse: {
            type: String,
            enum: ["confirmed", "denied"],
            default: null
        },
        respondedAt: { type: Date, default: null },

        // Follow-up after the user reports "not me"
        followUp: {
            type: String,
            enum: ["ignored", "action_taken"],
            default: null
        },
        actionsTaken: [
            {
                type: String,
                enum: ["pin_changed"]
            }
        ]
    },
    { timestamps: true }
);

export default mongoose.model("Alert", alertSchema);