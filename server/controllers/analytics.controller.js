import { getSummary } from "../services/analytics.service.js";

export const summary = async (req, res) => {
    res.json({ success: true, data: await getSummary(req.user.phone) });
};