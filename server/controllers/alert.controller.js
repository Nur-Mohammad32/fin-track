
import { getAlerts, markRead } from "../services/anomaly.service.js";

// GET /api/alerts             -> all alerts
// GET /api/alerts?unread=true -> only unread
export const list = async (req, res) => {
    const displayType = ["red_alert", "notification"].includes(
        req.query.type
    )
        ? req.query.type
        : null;
    const alerts = await getAlerts(req.user.phone, {
        unreadOnly: req.query.unread === "true",
        displayType
    });
    res.json({
        success: true,
        data: alerts,
        meta: {
            type: displayType || "all",
            redAlertThreshold: 80
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