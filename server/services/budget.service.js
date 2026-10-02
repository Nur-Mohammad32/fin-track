// server/services/budget.service.js
// Feature 3: Budget & saving.
// Looks at up to 3 recent full months of spending + income, then builds a
// monthly budget per category that makes the saving goal possible.

import BudgetPlan from "../models/budgetPlan.model.js";
import {
    monthRange,
    spendByCategory,
    totalIncome
} from "./analytics.service.js";

// Categories we do not cut (rent, bills, medicine, school, loans...)
const FIXED = [
    "housing",
    "bills-utilities",
    "healthcare",
    "education",
    "financial"
];

// Never ask the user to cut more than 70% of their flexible spending
const MAX_CUT = 0.7;

const fail = (message, statusCode = 422) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

// Average monthly spend per category + average income.
// Looks at the last 3 full months and only counts months that have spending.
const getHistory = async (phone) => {
    const totals = {};
    let income = 0;
    let monthsUsed = 0;

    for (const offset of [-3, -2, -1]) {
        const { start, end } = monthRange(offset);
        const rows = await spendByCategory(phone, start, end);

        if (rows.length === 0) continue; // skip months with no spending

        monthsUsed++;
        rows.forEach((r) => {
            totals[r._id] = (totals[r._id] || 0) + r.total;
        });
        income += await totalIncome(phone, start, end);
    }

    const avg = {};
    Object.entries(totals).forEach(([cat, total]) => {
        avg[cat] = total / monthsUsed;
    });

    const avgExpense = Object.values(avg).reduce((s, v) => s + v, 0);
    const avgIncome = monthsUsed > 0 ? income / monthsUsed : 0;

    return { avg, avgExpense, avgIncome, monthsUsed };
};

export const createPlan = async (user, { goalAmount, months }) => {
    goalAmount = Number(goalAmount);
    months = Number(months);

    if (!(goalAmount > 0) || !(months >= 1)) {
        throw fail("goalAmount and months must be positive numbers", 400);
    }

    const { avg, avgExpense, avgIncome, monthsUsed } = await getHistory(
        user.phone
    );

    if (monthsUsed === 0) {
        throw fail("Not enough transaction history yet to build a budget");
    }

    const monthlyTarget = Math.round(goalAmount / months);

    // How much the user can spend per month and still reach the goal.
    // Use income if we know it, otherwise current average spending.
    const base = avgIncome > 0 ? avgIncome : avgExpense;
    const allowedSpend = base - monthlyTarget;
    const cutNeeded = Math.max(0, avgExpense - allowedSpend);

    const flexibleTotal = Object.entries(avg)
        .filter(([cat]) => !FIXED.includes(cat))
        .reduce((s, [, v]) => s + v, 0);

    // Goal is too big for this user's income/spending
    if (allowedSpend <= 0 || cutNeeded > flexibleTotal * MAX_CUT) {
        return {
            feasible: false,
            message:
                "This goal is too high for your current income and spending. Try a smaller amount or more months.",
            monthlyTarget,
            avgMonthlyIncome: Math.round(avgIncome),
            avgMonthlyExpense: Math.round(avgExpense),
            basedOnMonths: monthsUsed
        };
    }

    // Cut only flexible categories, in proportion to what they spend now
    const ratio = flexibleTotal > 0 ? cutNeeded / flexibleTotal : 0;

    const categoryBudgets = Object.entries(avg).map(([category, value]) => ({
        category,
        limit: Math.round(
            FIXED.includes(category) ? value : value * (1 - ratio)
        )
    }));

    // Only one active plan at a time
    await BudgetPlan.updateMany(
        { phone: user.phone, active: true },
        { active: false }
    );

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const plan = await BudgetPlan.create({
        phone: user.phone,
        goalAmount,
        months,
        monthlyTarget,
        startDate,
        endDate,
        startingBalance: user.currentBalance,
        categoryBudgets
    });

    return {
        feasible: true,
        plan,
        avgMonthlyIncome: Math.round(avgIncome),
        avgMonthlyExpense: Math.round(avgExpense),
        reducedBy: Math.round(cutNeeded),
        basedOnMonths: monthsUsed
    };
};

// Progress of the active plan: this month's spending vs limits + savings
export const getProgress = async (user) => {
    const plan = await BudgetPlan.findOne({
        phone: user.phone,
        active: true
    });
    if (!plan) return null;

    const { start, end } = monthRange(0);
    const rows = await spendByCategory(user.phone, start, end);

    const categories = plan.categoryBudgets.map(({ category, limit }) => {
        const spent = rows.find((r) => r._id === category)?.total || 0;
        const used = limit > 0 ? spent / limit : spent > 0 ? 2 : 0;
        return {
            category,
            limit,
            spent,
            remaining: limit - spent,
            status: used > 1 ? "over" : used >= 0.8 ? "warning" : "ok"
        };
    });

    // Categories with spending this month but no budget in the plan
    rows.forEach((r) => {
        if (!categories.find((c) => c.category === r._id)) {
            categories.push({
                category: r._id,
                limit: 0,
                spent: r.total,
                remaining: -r.total,
                status: "over"
            });
        }
    });

    // Only count fully completed months (never more than the plan length)
    const monthsElapsed = Math.min(
        plan.months,
        Math.floor(
            (Date.now() - plan.startDate) / (30 * 24 * 60 * 60 * 1000)
        )
    );
    const savedSoFar = user.currentBalance - plan.startingBalance;
    const expectedSoFar = plan.monthlyTarget * monthsElapsed;

    return {
        goalAmount: plan.goalAmount,
        monthlyTarget: plan.monthlyTarget,
        endDate: plan.endDate,
        savedSoFar,
        expectedSoFar,
        onTrack: savedSoFar >= expectedSoFar,
        categories
    };
};