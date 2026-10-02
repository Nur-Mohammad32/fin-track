// server/services/recommendation.service.js
// Feature 5: Personalized recommendation - where to reduce expense.
// Step 1: rules find the problem categories from the spending summary.
// Step 2: LLM turns those facts into short friendly tips.
// If the LLM fails, the rule-based facts are returned instead.

import { getSummary } from "./analytics.service.js";
import { askLLM } from "./llm.service.js";

// Categories we never suggest cutting
const FIXED = [
    "housing",
    "bills-utilities",
    "healthcare",
    "education",
    "financial"
];

const findIssues = (summary) => {
    const issues = [];

    // 1. Flexible categories that grew 20%+ compared to the month before
    summary.categories
        .filter(
            (c) =>
                !FIXED.includes(c.category) &&
                c.category !== "other" &&
                c.previous > 0 &&
                c.changePercent !== null &&
                c.changePercent >= 20
        )
        .forEach((c) =>
            issues.push(
                `${c.category} spending is up ${c.changePercent}% vs the month before (${c.previous} -> ${c.current} BDT).`
            )
        );

    // 2. One flexible category takes 30%+ of all spending
    summary.categories
        .filter((c) => !FIXED.includes(c.category) && summary.spent > 0)
        .forEach((c) => {
            const share = Math.round((c.current / summary.spent) * 100);
            if (share >= 30) {
                issues.push(
                    `${c.category} is ${share}% of all spending this month (${c.current} of ${summary.spent} BDT).`
                );
            }
        });

    // 3. Spending is higher than income
    if (summary.income > 0 && summary.spent > summary.income) {
        issues.push(
            `Spending (${summary.spent} BDT) is higher than income (${summary.income} BDT) this month.`
        );
    }

    return issues;
};

export const getRecommendations = async (phone) => {
    // Use this month; if nothing spent yet, use the last full month instead
    let summary = await getSummary(phone, 0);
    if (summary.spent === 0) summary = await getSummary(phone, -1);

    if (summary.spent === 0) {
        return {
            source: "rules",
            month: summary.month,
            tips: ["Not enough spending data yet."],
            facts: []
        };
    }

    const issues = findIssues(summary);

    if (issues.length === 0) {
        return {
            source: "rules",
            month: summary.month,
            tips: ["Your spending looks balanced. Keep it up!"],
            facts: []
        };
    }

    try {
        const answer = await askLLM(
            `You are a friendly personal finance coach in a mobile wallet app in Bangladesh.
Based on these facts about the user's spending, give 3 short, practical tips to reduce expenses.
Write in simple Banglish (Bangla written in English letters).
One tip per line. No numbering, no extra text.

Facts:
${issues.map((i) => "- " + i).join("\n")}`,
            { temperature: 0.4 }
        );

        const tips = answer
            .split("\n")
            .map((t) => t.replace(/^[-*\d.\s]+/, "").trim())
            .filter(Boolean)
            .slice(0, 3);

        if (tips.length > 0) {
            return { source: "llm", month: summary.month, tips, facts: issues };
        }
    } catch (error) {
        console.error("Recommendation LLM error:", error.message);
    }

    // LLM failed or returned nothing -> return the plain facts
    return { source: "rules", month: summary.month, tips: issues, facts: issues };
};