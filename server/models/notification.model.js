import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, index: true },
        type: {
            type: String,
            enum: ["daily_recommendation"],
            required: true
        },
        date: { type: String, required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        tips: [String],
        source: { type: String, enum: ["llm", "rules"], default: "llm" },
        read: { type: Boolean, default: false }
    },
    { timestamps: true }
);

notificationSchema.index({ phone: 1, type: 1, date: 1 }, { unique: true });

export default mongoose.model("Notification", notificationSchema);
