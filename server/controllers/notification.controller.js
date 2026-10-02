import {
    generateDailyForUser,
    listNotifications,
    markNotificationRead
} from "../services/recommendation.service.js";

export const list = async (req, res) => {
    try {
        await generateDailyForUser(req.user);
    } catch (error) {
        console.error("Daily recommendation failed:", error.message);
    }

    const data = await listNotifications(req.user.phone, {
        unreadOnly: req.query.unread === "true"
    });
    res.json({ success: true, data });
};

export const generate = async (req, res) => {
    const data = await generateDailyForUser(req.user, {
        force: req.query.force === "true"
    });
    if (!data) {
        return res.json({
            success: false,
            message: "Not enough spending data yet"
        });
    }
    res.json({ success: true, data });
};

export const read = async (req, res) => {
    const data = await markNotificationRead(req.user.phone, req.params.id);
    if (!data) {
        return res
            .status(404)
            .json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, data });
};
