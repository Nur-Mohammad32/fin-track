
// Feature 4: Anomaly detection (suspicious transactions).
// Simple rules based on the user's own history. Creates an Alert for each hit.
// Called right after a successful transaction (see transaction.controller.js).

import Transaction from "../models/transaction.model.js";
import Alert from "../models/alert.model.js";

const DAY = 24 * 60 * 60 * 1000;

// Hour of day (0-23) in Bangladesh time
const dhakaHour = (date) =>
    Number(
        new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            hour12: false,
            timeZone: "Asia/Dhaka"
        }).format(date)
    ) % 24;

export const checkTransaction = async (txn) => {
    if (txn.status !== "success") return [];

    // When this transaction happened (transactionDate replaced createdAt)
    const at = new Date(txn.transactionDate || txn.createdAt || Date.now());

    // The user's earlier outgoing transactions from the last 90 days
    const history = await Transaction.find({
        from: txn.from,
        status: "success",
        transactionId: { $ne: txn.transactionId },
        transactionDate: { $gte: new Date(at - 90 * DAY), $lte: at }
    }).limit(200);

    const avg =
        history.length > 0
            ? history.reduce((s, t) => s + t.amount, 0) / history.length
            : 0;

    const hits = [];

    // 1. Much bigger than usual
    if (history.length >= 5 && txn.amount > avg * 3 && txn.amount > 500) {
        hits.push({
            type: "large_amount",
            severity: txn.amount > avg * 5 ? "high" : "medium",
            message: `${txn.amount} BDT sent to ${txn.to}. Your usual transaction is about ${Math.round(avg)} BDT.`
        });
    }

    // 2. Big amount to someone never paid before
    const knownRecipient = history.some((t) => t.to === txn.to);
    if (history.length >= 3 && !knownRecipient && txn.amount > avg * 2) {
        hits.push({
            type: "new_recipient",
            severity: "medium",
            message: `First time sending money to ${txn.to}, and the amount (${txn.amount} BDT) is higher than usual.`
        });
    }

    // 3. Late night (12am-5am) and above-average amount
    if (dhakaHour(at) < 5 && history.length >= 5 && txn.amount > avg * 1.5) {
        hits.push({
            type: "odd_hour",
            severity: "low",
            message: `${txn.amount} BDT sent late at night, which is unusual for you.`
        });
    }

    // 4. Many transactions in a short time (5+ in 10 minutes, including this one)
    const recent = await Transaction.countDocuments({
        from: txn.from,
        transactionDate: { $gte: new Date(at - 10 * 60 * 1000), $lte: at }
    });
    if (recent >= 5) {
        hits.push({
            type: "rapid_transactions",
            severity: "high",
            message: `${recent} transactions in the last 10 minutes.`
        });
    }

    if (hits.length === 0) return [];

    return Alert.insertMany(
        hits.map((h) => ({
            ...h,
            phone: txn.from,
            transactionId: txn.transactionId
        }))
    );
};

export const getAlerts = (phone, { unreadOnly = false } = {}) =>
    Alert.find({ phone, ...(unreadOnly && { read: false }) })
        .sort({ createdAt: -1 })
        .limit(50);

export const markRead = (phone, id) =>
    Alert.findOneAndUpdate(
        { _id: id, phone },
        { read: true },
        { new: true }
    );