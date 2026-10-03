
import {
    getAlerts,
    markRead,
    respondToAlert,
    recordFollowUp,
    createSupportTicket,
    RED_ALERT_THRESHOLD
} from "../services/anomaly.service.js";

// GET /api/alerts             -> all alerts
// GET /api/alerts?unread=true -> only unread
// GET /api/alerts?min_confidence=70 -> only alerts with confidence above 70 (Home Page)
export const list = async (req, res) => {
    const displayType = ["red_alert", "notification"].includes(
        req.query.type
    )
        ? req.query.type
        : null;
    const minConfidence =
        req.query.min_confidence !== undefined
            ? Number(req.query.min_confidence)
            : null;
    if (minConfidence !== null && !Number.isFinite(minConfidence)) {
        return res
            .status(400)
            .json({ success: false, message: "min_confidence must be a number" });
    }
    const alerts = await getAlerts(req.user.phone, {
        unreadOnly: req.query.unread === "true",
        displayType,
        minConfidence
    });
    res.json({
        success: true,
        data: alerts,
        meta: {
            type: displayType || "all",
            redAlertThreshold: RED_ALERT_THRESHOLD
        }
    });
};

// PATCH /api/alerts/:id/read
export const read = async (req, res) => {
    const alert = await markRead(req.user.phone, req.params.id);
    if (!alert) {
        return res
            .status(404)
            .json({ success: false, message: "Alert not found" });
    }
    res.json({ success: true, data: alert });
};

// PATCH /api/alerts/:id/respond   body: { confirmed: boolean }
export const respond = async (req, res) => {
    const confirmed = req.body?.confirmed;

    if (typeof confirmed !== "boolean") {
        return res.status(400).json({
            success: false,
            message:
                "confirmed must be a boolean (true = it was me, false = it was not me)"
        });
    }

    const alert = await respondToAlert(req.user.phone, req.params.id, confirmed);
    if (!alert) {
        return res.status(404).json({ success: false, message: "Alert not found" });
    }
    res.json({ success: true, data: alert });
};

// PATCH /api/alerts/:id/follow-up   body: { action: "ignore" | "pin_changed" }
export const followUp = async (req, res) => {
    const alert = await recordFollowUp(
        req.user.phone,
        req.params.id,
        req.body?.action
    );
    res.json({ success: true, data: alert });
};

// POST /api/alerts/:id/ticket   create a support ticket (marks alert handled)
export const createTicket = async (req, res) => {
    const alert = await createSupportTicket(req.user.phone, req.params.id);
    res.status(201).json({ success: true, data: alert });
};