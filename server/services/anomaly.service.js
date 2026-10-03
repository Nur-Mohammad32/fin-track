
// Feature 4: Anomaly detection (suspicious transactions).
// Simple rules based on the user's own history. Creates an Alert for each hit.
// Called right after a successful transaction (see transaction.controller.js).

import Transaction from "../models/transaction.model.js";
import Alert from "../models/alert.model.js";
import { askLLM, parseJsonLoose } from "./llm.service.js";

const DAY = 24 * 60 * 60 * 1000;

// Risk probability above this becomes a home screen red alert
export const RED_ALERT_THRESHOLD = 70;

// Hour of day (0-23) in Bangladesh time
const dhakaHour = (date) =>
    Number(
        new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            hour12: false,
            timeZone: "Asia/Dhaka"
        }).format(date)
    ) % 24;

// Without a valid LLM assessment, do not claim high confidence.
const fallbackConfidence = () => 0;

const classifyConfidence = async (txn, hits) => {
    const fallback = new Map(
        hits.map((hit) => [hit.type, fallbackConfidence()])
    );

    try {
        const answer = await askLLM(
            `You are a fraud/anomaly risk classifier.
Review only the verified transaction anomaly evidence below.
For every anomaly type, estimate how confident you are that it represents
a genuinely suspicious event for this user. Return ONLY valid JSON:
{"results":[{"type":"large_amount","confidence":0}]}
Confidence must be an integer from 0 to 100. Do not invent facts.
A confidence higher than ${RED_ALERT_THRESHOLD} means the app may show a
prominent red alert. ${RED_ALERT_THRESHOLD} or below means it belongs in
the general notification panel.

Transaction:
${JSON.stringify({
                amount: txn.amount,
                recipient: txn.to,
                type: txn.transactionType,
                category: txn.category
            })}

Detected evidence:
${hits.map((hit) => `- ${hit.type}: ${hit.message}`).join("\n")}`,
            { temperature: 0 }
        );
        const parsed = parseJsonLoose(answer);
        if (parsed && Array.isArray(parsed.results)) {
            for (const item of parsed.results) {
                const confidence = Number(item.confidence);
                if (
                    hits.some((hit) => hit.type === item.type) &&
                    Number.isInteger(confidence) &&
                    confidence >= 0 &&
                    confidence <= 100
                ) {
                    fallback.set(item.type, confidence);
                }
            }
        }
    } catch (error) {
        console.error("Anomaly confidence classification failed:", error.message);
    }

    return fallback;
};

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

    const confidenceByType = await classifyConfidence(txn, hits);

    return Alert.insertMany(
        hits.map((hit) => {
            const confidence = confidenceByType.get(hit.type);
            return {
                ...hit,
                phone: txn.from,
                transactionId: txn.transactionId,
                confidence,
                // Home screen red alert: risk probability over the
                // threshold. Anything lower stays in the notification panel.
                displayType:
                    confidence > RED_ALERT_THRESHOLD
                        ? "red_alert"
                        : "notification"
            };
        })
    );
};

export const getAlerts = (
    phone,
    { unreadOnly = false, displayType = null } = {}
) =>
    Alert.find({
        phone,
        ...(unreadOnly && { read: false }),
        ...(displayType && { displayType })
    })
        .sort({ createdAt: -1 })
        .limit(50);

export const markRead = (phone, id) =>
    Alert.findOneAndUpdate(
        { _id: id, phone },
        { read: true },
        { new: true }
    );

// Record the user's answer to "Was this you?".
// "confirmed" marks the alert read so it disappears.
// "denied" keeps it unread: the follow-up options and the
// home screen red banner stay visible.
export const respondToAlert = (phone, id, confirmed) =>
    Alert.findOneAndUpdate(
        { _id: id, phone },
        confirmed
            ? {
                    userResponse: "confirmed",
                    respondedAt: new Date(),
                    read: true
                }
            : { userResponse: "denied", respondedAt: new Date() },
        { new: true }
    );

// Record the follow-up choice after the user reports "not me".
// "ignore" keeps the alert unread (the red banner remains).
// "pin_changed" records the step (the PIN change itself happens
// through the existing change-pin endpoint).
export const recordFollowUp = async (phone, id, action) => {
    if (!["ignore", "pin_changed"].includes(action)) {
        const error = new Error("action must be ignore or pin_changed");
        error.statusCode = 400;
        throw error;
    }

    const alert = await Alert.findOne({ _id: id, phone });
    if (!alert) {
        const error = new Error("Alert not found");
        error.statusCode = 404;
        throw error;
    }

    alert.followUp = action === "ignore" ? "ignored" : "action_taken";

    if (action === "pin_changed") {
        alert.actionsTaken.addToSet("pin_changed");
    }

    await alert.save();
    return alert;
};