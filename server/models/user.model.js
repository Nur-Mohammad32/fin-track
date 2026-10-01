import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        pin: {
            type: String,
            required: true
        },

        accountType: {
            type: String,
            enum: ["general", "merchant"],
            required: true
        },

        businessType: {
            type: [
                {
                    type: String,
                    enum: [
                        "food_restaurant",
                        "grocery",
                        "clothing_fashion",
                        "electronics",
                        "healthcare_pharmacy",
                        "education",
                        "transport",
                        "travel_hotel",
                        "beauty_personal_care",
                        "home_furniture",
                        "entertainment",
                        "professional_services",
                        "online_ecommerce",
                        "wholesale",
                        "other"
                    ]
                }
            ],
            default: []
        },

        currentBalance: {
            type: Number,
            default: 0,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", UserSchema);

export default User;