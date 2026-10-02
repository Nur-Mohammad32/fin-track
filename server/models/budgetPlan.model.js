
import mongoose from "mongoose";

const budgetPlanSchema = new mongoose.Schema(
    {
        phone: { type: String, required: true, index: true },

        // The user's goal, e.g. save 60000 in 6 months
        goalAmount: { type: Number, required: true, min: 1 },
        months: { type: Number, required: true, min: 1 },
        monthlyTarget: { type: Number, required: true },

        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },

        // Balance when the plan was made (used to measure saving progress)
        startingBalance: { type: Number, required: true },

        // Monthly spending limit per category
        categoryBudgets: [
            {
                _id: false,
                category: String,
                limit: Number
            }
        ],

        active: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export default mongoose.model("BudgetPlan", budgetPlanSchema);
