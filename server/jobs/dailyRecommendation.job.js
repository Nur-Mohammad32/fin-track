import cron from "node-cron";
import { runDailyForAllUsers } from "../services/recommendation.service.js";

export const startDailyRecommendationJob = () => {
    if (process.env.DAILY_JOB === "off") return;

    cron.schedule(
        "0 8 * * *",
        () => {
            runDailyForAllUsers().catch((error) =>
                console.error("Daily job failed:", error.message)
            );
        },
        { timezone: "Asia/Dhaka" }
    );

    console.log("Daily recommendation job scheduled (8:00 AM Asia/Dhaka)");
};
