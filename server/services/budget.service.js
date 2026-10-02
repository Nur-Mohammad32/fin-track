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
import { askLLM } from "./llm.service.js";

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
const roundToHundred = (value) => Math.round(value / 100) * 100;

const fail = (message, statusCode = 422) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const generateGoalMessage = async ({
    goalAmount,
    months,
    monthlyTarget,
    avgMonthlyIncome,
    avgMonthlyExpense,
    allowedSpend,
    cutNeeded,
    cuts,
    feasible
}) => {
    const roundedCuts = cuts.map(({ category, current, limit, cut }) => ({
        category,
        current: Math.round(current / 100) * 100,
        limit: Math.round(limit / 100) * 100,
        cut: Math.round(cut / 100) * 100
    }));
    const roundedCutNeeded = Math.round(cutNeeded / 100) * 100;

    const verifiedNumbers = new Set(
        [
            goalAmount,
            months,
            monthlyTarget,
            avgMonthlyIncome,
            avgMonthlyExpense,
            Math.max(0, Math.round(allowedSpend)),
            Math.round(cutNeeded),
            roundedCutNeeded,
            ...roundedCuts.flatMap(({ current, limit, cut }) => [
                current,
                limit,
                cut
            ])
        ].map((value) => Math.round(Number(value)))
    );

    const fallback = feasible
        ? cutNeeded > 0
            ? `To save ${monthlyTarget} BDT per month, you need to reduce your average spending from ${avgMonthlyExpense} BDT to approximately ${Math.round(allowedSpend / 100) * 100} BDT. This means cutting approximately ${roundedCutNeeded} BDT per month. Focus on: ${roundedCuts
                  .slice(0, 3)
                  .map(({ category, cut }) => `${category} by ${cut} BDT`)
                  .join(", ")}.`
            : `You can already reach this goal! You do not need to reduce any expenses to save ${monthlyTarget} BDT per month.`
        : `This goal requires saving ${monthlyTarget} BDT per month, but your average income is ${avgMonthlyIncome} BDT and your average expenses are ${avgMonthlyExpense} BDT. Try a smaller goal or a longer timeline.`;

    const cutDetails = !feasible
        ? "Goal is not achievable even with the maximum allowed cuts."
        : roundedCuts.length
            ? roundedCuts
                  .map(
                      ({ category, current, limit, cut }) =>
                          `${category}: current ${current} BDT, target ${limit} BDT, reduce by ${cut} BDT`
                  )
                  .join("\n")
            : "No category cuts are required.";

    try {
        const answer = await askLLM(
            `You are a practical personal finance coach.
The user wants to save ${goalAmount} BDT in ${months} months.
Use only the verified numbers below. Do not invent amounts or categories.
Explain how much they need to save per month, whether the goal is feasible,
and which spending areas they should reduce or change to reach it.
Give a concise, friendly response in English, no more than 3 sentences.
When recommending expense cuts, always use approximate round figures to the nearest 100 BDT
(for example, say 1,400 BDT instead of 1,343 BDT). Do not use exact unrounded cut amounts.
Prioritize expenses by necessity before suggesting cuts. Protect healthcare and medicine,
housing, bills and utilities, education, and financial obligations because they are essential.
Recommend reducing flexible and discretionary categories first, such as dining, entertainment,
shopping, travel, or other non-essential spending. Never recommend cutting an essential
category when a flexible category is available, and never recommend a category that is not
listed in the verified category analysis. If several flexible categories are available,
prioritize the category with the largest reducible amount while keeping the advice practical.

Verified numbers:
- Monthly saving target: ${monthlyTarget} BDT
- Average monthly income: ${avgMonthlyIncome} BDT
- Average monthly spending: ${avgMonthlyExpense} BDT
- Maximum allowed monthly spending: ${Math.max(0, Math.round(allowedSpend))} BDT
- Required monthly spending reduction: approximately ${roundedCutNeeded} BDT
- Feasible: ${feasible}
- Category analysis:
${cutDetails}`,
            { temperature: 0.3 }
        );

        const responseNumbers = [...answer.matchAll(/\b\d+(?:,\d{3})*(?:\.\d+)?\b/g)]
            .map(([value]) => Math.round(Number(value.replaceAll(",", ""))));
        const usesOnlyVerifiedNumbers = responseNumbers.every((value) =>
            verifiedNumbers.has(value)
        );

        if (answer && usesOnlyVerifiedNumbers) {
            return { message: answer, adviceSource: "llm" };
        }

        if (answer && !usesOnlyVerifiedNumbers) {
            console.error("Budget goal LLM returned an unverified number");
        }
    } catch (error) {
        console.error("Budget goal LLM error:", error.message);
    }

    return { message: fallback, adviceSource: "rules" };
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

// save = true saves the plan; save = false only returns the calculation.
export const createPlan = async (
    user,
    { goalAmount, months },
    { save = true } = {}
) => {
    goalAmount = Number(goalAmount);
    months = Number(months);

    if (
        !Number.isFinite(goalAmount) ||
        goalAmount <= 0 ||
        !Number.isInteger(months) ||
        months < 1 ||
        months > 120
    ) {
        throw fail(
            "goalAmount must be a finite positive number and months must be an integer from 1 to 120",
            400
        );
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

    const numbers = {
        monthlyTarget,
        avgMonthlyIncome: Math.round(avgIncome),
        avgMonthlyExpense: Math.round(avgExpense),
        basedOnMonths: monthsUsed
    };

    // Build category analysis for both feasible and infeasible goals. For an
    // infeasible goal, cap suggested cuts at the safe maximum.
    const ratio =
        flexibleTotal > 0
            ? Math.min(cutNeeded / flexibleTotal, MAX_CUT)
            : 0;

    const categoryBudgets = Object.entries(avg).map(([category, value]) => ({
        category,
        limit: roundToHundred(
            FIXED.includes(category) ? value : value * (1 - ratio)
        )
    }));

    const cuts = categoryBudgets
        .map((budget) => ({
            category: budget.category,
            current: roundToHundred(avg[budget.category]),
            limit: budget.limit,
            cut: roundToHundred(
                roundToHundred(avg[budget.category]) - budget.limit
            )
        }))
        .filter((cut) => cut.cut > 0)
        .sort((a, b) => b.cut - a.cut);

    // Goal is too big for this user's income/spending
    if (allowedSpend <= 0 || cutNeeded > flexibleTotal * MAX_CUT) {
        const advice = await generateGoalMessage({
            goalAmount,
            months,
            ...numbers,
            allowedSpend,
            cutNeeded,
            cuts,
            feasible: false
        });

        return {
            feasible: false,
            ...advice,
            ...numbers,
            reducedBy: roundToHundred(cutNeeded),
            cuts,
            categoryBudgets
        };
    }

    const advice = await generateGoalMessage({
        goalAmount,
        months,
        ...numbers,
        allowedSpend,
        cutNeeded,
        cuts,
        feasible: true
    });

    const result = {
        feasible: true,
        ...advice,
        ...numbers,
        reducedBy: roundToHundred(cutNeeded),
        cuts,
        categoryBudgets
    };

    if (!save) return { ...result, preview: true };

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

    return { ...result, plan };
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