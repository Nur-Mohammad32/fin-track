// server/controllers/budget.controller.js
import { createPlan, getProgress } from "../services/budget.service.js";

// POST /api/budget   body: { goalAmount, months }
export const create = async (req, res) => {
    const { goalAmount, months } = req.body;
    const result = await createPlan(req.user, { goalAmount, months });
    res.status(result.feasible ? 201 : 200).json({
        success: result.feasible,
        data: result
    });
};

// POST /api/budget/preview   -> calculate without saving a plan
export const preview = async (req, res) => {
    const { goalAmount, months } = req.body;
    const result = await createPlan(
        req.user,
        { goalAmount, months },
        { save: false }
    );
    res.json({ success: result.feasible, data: result });
};

// GET /api/budget   -> progress of the active plan
export const progress = async (req, res) => {
    const data = await getProgress(req.user);
    if (!data) {
        return res.status(404).json({
            success: false,
            message: "No active budget plan"
        });
    }
    res.json({ success: true, data });
};
