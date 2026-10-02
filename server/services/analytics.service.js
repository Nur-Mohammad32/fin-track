// server/services/analytics.service.js
// Feature 2: Spending analysis summary.
// "Outgoing" = transactions the user sent (from = phone).
// "Incoming" = transactions the user received (to = phone).

import Transaction from "../models/transaction.model.js";

// offset 0 = this month, -1 = last month, -2 = two months ago ...
export const monthRange = (offset = 0) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
    return { start, end };
};

// The real transaction date. Falls back to createdAt for older documents.
const TXN_DATE = { $ifNull: ["$transactionDate", "$createdAt"] };

const inRange = (start, end) => ({
    $expr: {
        $and: [
            { $gte: [TXN_DATE, start] },
            { $lt: [TXN_DATE, end] }
        ]
    }
});

// Total spent per category between two dates (successful sends only)
export const spendByCategory = (phone, start, end) =>
    Transaction.aggregate([
        {
            $match: {
                from: phone,
                status: "success",
                ...inRange(start, end)
            }
        },
        {
            $group: {
                _id: "$category",
                total: { $sum: "$amount" },
                count: { $sum: 1 }
            }
        }
    ]);

// Total money received between two dates
export const totalIncome = async (phone, start, end) => {
    const [row] = await Transaction.aggregate([
        {
            $match: {
                to: phone,
                from: { $ne: phone },
                status: "success",
                ...inRange(start, end)
            }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return row?.total || 0;
};

const sum = (rows) => rows.reduce((s, r) => s + r.total, 0);

// % change from prev to cur (null if there was nothing before)
const percent = (cur, prev) =>
    prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

export const getSummary = async (phone) => {
    const cur = monthRange(0);
    const prev = monthRange(-1);

    const [curRows, prevRows, income, prevIncome] = await Promise.all([
        spendByCategory(phone, cur.start, cur.end),
        spendByCategory(phone, prev.start, prev.end),
        totalIncome(phone, cur.start, cur.end),
        totalIncome(phone, prev.start, prev.end)
    ]);

    const spent = sum(curRows);
    const prevSpent = sum(prevRows);

    // Merge this month and last month, per category
    const names = new Set([
        ...curRows.map((r) => r._id),
        ...prevRows.map((r) => r._id)
    ]);

    const categories = [...names]
        .map((category) => {
            const current =
                curRows.find((r) => r._id === category)?.total || 0;
            const previous =
                prevRows.find((r) => r._id === category)?.total || 0;
            const diff = current - previous;
            return {
                category,
                current,
                previous,
                diff,
                changePercent: percent(current, previous),
                trend: diff > 0 ? "more" : diff < 0 ? "less" : "same"
            };
        })
        .sort((a, b) => b.current - a.current);

    const withSpend = categories.filter((c) => c.current > 0);

    return {
        month: `${cur.start.getFullYear()}-${String(cur.start.getMonth() + 1).padStart(2, "0")}`,
        spent,
        income,
        prevSpent,
        prevIncome,
        spentChangePercent: percent(spent, prevSpent),
        topCategory: withSpend[0]?.category || null,
        lowestCategory: withSpend.at(-1)?.category || null,
        categories
    };
};