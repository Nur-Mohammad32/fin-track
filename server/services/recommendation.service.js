import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { getSummary } from "./analytics.service.js";
import { getProgress } from "./budget.service.js";
import { askLLM } from "./llm.service.js";

const FIXED = [
    "housing",
    "bills-utilities",
    "healthcare",
    "education",
    "financial"
];

const todayDhaka = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(
        new Date()
    );

const spendingFacts = (summary) => {
    const facts = [];

    summary.categories
        .filter(
            (category) =>
                !FIXED.includes(category.category) &&
                category.category !== "other" &&
                category.previous > 0 &&
                category.changePercent !== null &&
                category.changePercent >= 20
        )
        .forEach((category) =>
            facts.push(
                `${category.category} spending is up ${category.changePercent}% vs the month before (${category.previous} -> ${category.current} BDT).`
            )
        );

    summary.categories
        .filter(
            (category) =>
                !FIXED.includes(category.category) && summary.spent > 0
        )
        .forEach((category) => {
            const share = Math.round(
                (category.current / summary.spent) * 100
            );
            if (share >= 30) {
                facts.push(
                    `${category.category} is ${share}% of all spending (${category.current} of ${summary.spent} BDT).`
                );
            }
        });

    if (summary.income > 0 && summary.spent > summary.income) {
        facts.push(
            `Spending (${summary.spent} BDT) is higher than income (${summary.income} BDT).`
        );
    }

    return facts;
};

const goalFacts = (progress) => {
    if (!progress) return [];

    const facts = [
        `Saving goal: ${progress.goalAmount} BDT by ${new Date(progress.endDate)
            .toISOString()
            .slice(0, 10)} (${progress.monthlyTarget} BDT per month).`
    ];

    facts.push(
        progress.onTrack
            ? "Saving is on track so far."
            : `Balance changed by ${progress.savedSoFar} BDT since the plan started (target so far: ${progress.expectedSoFar} BDT).`
    );

    progress.categories
        .filter((category) => category.status === "over")
        .forEach((category) =>
            facts.push(
                `Budget exceeded for ${category.category}: spent ${category.spent} of ${category.limit} BDT.`
            )
        );

    progress.categories
        .filter((category) => category.status === "warning")
        .forEach((category) =>
            facts.push(
                `Budget almost used for ${category.category}: spent ${category.spent} of ${category.limit} BDT.`
            )
        );

    return facts;
};

export const getRecommendations = async (user) => {
    let summary = await getSummary(user.phone, 0);
    if (summary.spent === 0) summary = await getSummary(user.phone, -1);

    if (summary.spent === 0) {
        return {
            hasData: false,
            source: "rules",
            month: summary.month,
            tips: ["Not enough spending data yet."],
            facts: []
        };
    }

    const progress = await getProgress(user);
    const facts = [...spendingFacts(summary), ...goalFacts(progress)];

    if (facts.length === 0) {
        return {
            hasData: true,
            source: "rules",
            month: summary.month,
            tips: ["Your spending looks balanced. Keep it up!"],
            facts: []
        };
    }

    try {
        const answer = await askLLM(
            `You are a friendly personal finance coach in a mobile wallet app in Bangladesh.
Using ONLY the facts below, write exactly 3 short, practical tips (max 20 words each) that help the user reduce spending and reach their saving goal (if they have one).
Write in simple Banglish (Bangla written in English letters).
One tip per line. No numbering, no extra text. Do not invent numbers.

Facts:
${facts.map((fact) => "- " + fact).join("\n")}`,
            { temperature: 0.4 }
        );

        const tips = answer
            .split("\n")
            .map((tip) => tip.replace(/^[-*\d.\s]+/, "").trim())
            .filter(Boolean)
            .slice(0, 3);

        if (tips.length > 0) {
            return {
                hasData: true,
                source: "llm",
                month: summary.month,
                tips,
                facts
            };
        }
    } catch (error) {
        console.error("Recommendation LLM error:", error.message);
    }

    return {
        hasData: true,
        source: "rules",
        month: summary.month,
        tips: facts,
        facts
    };
};

export const generateDailyForUser = async (user, { force = false } = {}) => {
    const date = todayDhaka();
    const key = { phone: user.phone, type: "daily_recommendation", date };

    const existing = await Notification.findOne(key);
    if (existing && !force) return existing;

    const recommendation = await getRecommendations(user);
    if (!recommendation.hasData) return existing || null;

    return Notification.findOneAndUpdate(
        key,
        {
            ...key,
            title: "Aajker financial tip",
            message: recommendation.tips[0],
            tips: recommendation.tips,
            source: recommendation.source,
            read: false
        },
        { upsert: true, new: true }
    );
};

export const runDailyForAllUsers = async () => {
    const users = await User.find({ isActive: true });
    let created = 0;

    for (const user of users) {
        try {
            if (await generateDailyForUser(user)) created++;
        } catch (error) {
            console.error(
                `Daily recommendation failed for ${user.phone}:`,
                error.message
            );
        }
    }

    console.log(
        `Daily recommendations ready for ${created}/${users.length} users`
    );
};

export const listNotifications = (phone, { unreadOnly = false } = {}) =>
    Notification.find({
        phone,
        ...(unreadOnly ? { read: false } : {})
    })
        .sort({ date: -1, createdAt: -1 })
        .limit(30);

export const markNotificationRead = (phone, id) =>
    Notification.findOneAndUpdate(
        { _id: id, phone },
        { read: true },
        { new: true }
    );
