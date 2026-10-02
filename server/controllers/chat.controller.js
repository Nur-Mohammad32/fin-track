import { answerUserQuestion } from "../services/chatbot.service.js";

export const chat = async (req, res) => {
    const { question } = req.body;
    const data = await answerUserQuestion(req.user, question);
    res.json({ success: true, data });
};
