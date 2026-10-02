// server/controllers/analytics.controller.js
import { getSummary } from "../services/analytics.service.js";
import { getRecommendations } from "../services/recommendation.service.js";

export const summary = async (req, res) => {
    res.json({ success: true, data: await getSummary(req.user.phone) });
};

export const recommendations = async (req, res) => {
    res.json({
        success: true,
        data: await getRecommendations(req.user.phone)
    });
};