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

const roundBDT = (amount) => Math.round(amount / 100) * 100;

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
                `${category.category} spending is up ${category.changePercent}% vs the month before (${roundBDT(category.previous)} -> ${roundBDT(category.current)} BDT).`
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
                    `${category.category} is ${share}% of all spending (${roundBDT(category.current)} of ${roundBDT(summary.spent)} BDT).`
                );
            }
        });

    if (summary.income > 0 && summary.spent > summary.income) {
        facts.push(
            `Spending (${roundBDT(summary.spent)} BDT) is higher than income (${roundBDT(summary.income)} BDT).`
        );
    }

    return facts;
};

const goalFacts = (progress) => {
    if (!progress) return [];

    const facts = [
        `Saving goal: ${roundBDT(progress.goalAmount)} BDT by ${new Date(progress.endDate)
            .toISOString()
            .slice(0, 10)} (approximately ${roundBDT(progress.monthlyTarget)} BDT per month).`
    ];

    facts.push(
        progress.onTrack
            ? "Saving is on track so far."
            : `Balance changed by approximately ${roundBDT(progress.savedSoFar)} BDT since the plan started (target so far: approximately ${roundBDT(progress.expectedSoFar)} BDT).`
    );

    progress.categories
        .filter((category) => category.status === "over")
        .forEach((category) =>
            facts.push(
                `Budget exceeded for ${category.category}: spent approximately ${roundBDT(category.spent)} of approximately ${roundBDT(category.limit)} BDT.`
            )
        );

    progress.categories
        .filter((category) => category.status === "warning")
        .forEach((category) =>
            facts.push(
                `Budget almost used for ${category.category}: spent approximately ${roundBDT(category.spent)} of approximately ${roundBDT(category.limit)} BDT.`
            )
        );

    return facts;
};

const pacingFacts = (summary) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1
    ).padStart(2, "0")}`;

    if (summary.month !== currentMonth || summary.spent <= 0) return [];

    const daysElapsed = now.getDate();
    const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
    ).getDate();
    const projectedSpend = Math.round(
        (summary.spent / daysElapsed) * daysInMonth
    );
    const facts = [];

    if (summary.prevSpent > 0 && projectedSpend > summary.prevSpent * 1.1) {
        facts.push(
            `Only ${daysElapsed} of ${daysInMonth} days have passed, but spending is already approximately ${roundBDT(summary.spent)} BDT. At this pace, this month's spending may reach about ${roundBDT(projectedSpend)} BDT, compared with approximately ${roundBDT(summary.prevSpent)} BDT last month.`
        );
    }

    return facts;
};

export const getRecommendations = async (user) => {
    let summary = await getSummary(user.phone, 0);

    if (summary.spent === 0) {
        summary = await getSummary(user.phone, -1);
    }

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
    const facts = [
        ...spendingFacts(summary),
        ...pacingFacts(summary),
        ...goalFacts(progress)
    ];

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
Use ONLY the facts below. Do not assume missing information or invent numbers.
Write up to 3 short, practical financial tips, with each tip no longer than 20 words.
Write in simple English, one tip per line, with no numbering or extra text.
Always use approximate round BDT figures to the nearest 100 (for example, 8,900 BDT, not 8,876 BDT).
Treat any fact about projected spending, overspending, or an exceeded budget as a warning.
When a warning exists, make the first tip clearly tell the user to slow down spending and protect their saving goal.
Mention the projected amount or comparison only when it appears in the facts.
Never say spending is balanced, healthy, or on track when a warning fact exists.
Only say spending is balanced when the facts contain no warning.

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

    if (!force) {
        const existing = await Notification.findOne({
            phone: user.phone,
            type: "daily_recommendation",
            date
        });

        if (existing) {
            return existing;
        }
    }

    const recommendation = await getRecommendations(user);

    if (!recommendation.hasData) {
        return null;
    }

    const doc = {
        phone: user.phone,
        type: "daily_recommendation",
        date,
        title: "Aajker financial tip",
        message: recommendation.tips[0],
        tips: recommendation.tips,
        source: recommendation.source,
        read: false
    };

    try {
        if (force) {
            return await Notification.findOneAndUpdate(
                {
                    phone: user.phone,
                    type: "daily_recommendation",
                    date
                },
                doc,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        }

        return await Notification.create(doc);
    } catch (error) {
        // Race: two parallel refreshes generated at once. Re-read the winner.
        if (error?.code === 11000) {
            return Notification.findOne({
                phone: user.phone,
                type: "daily_recommendation",
                date
            });
        }
        throw error;
    }
};

export const getTodaysRecommendation = async (user) => {
    const date = todayDhaka();

    const cached = await Notification.findOne({
        phone: user.phone,
        type: "daily_recommendation",
        date
    });

    if (cached) {
        return {
            hasData: true,
            source: cached.source,
            month: cached.date,
            tips: cached.tips,
            facts: [],
            cached: true,
            notificationId: cached._id,
            date: cached.date
        };
    }

    const created = await generateDailyForUser(user);

    if (created) {
        return {
            hasData: true,
            source: created.source,
            month: created.date,
            tips: created.tips,
            facts: [],
            cached: false,
            notificationId: created._id,
            date: created.date
        };
    }

    return {
        hasData: false,
        source: "rules",
        month: date.slice(0, 7),
        tips: ["Not enough spending data yet."],
        facts: [],
        cached: false,
        date
    };
};

export const runDailyForAllUsers = async () => {
    const users = await User.find({ isActive: true });

    let created = 0;

    for (const user of users) {
        try {
            const notification = await generateDailyForUser(user);

            if (notification) {
                created++;
            }
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