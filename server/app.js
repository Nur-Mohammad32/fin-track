import express from "express";
import dns from "node:dns";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";

// Use a public DNS resolver for MongoDB SRV lookups.
dns.setServers(["8.8.8.8"]);

import userAuthRoutes from "./routes/userAuth.route.js";
import systemUserAuthRoutes from "./routes/systemUserAuth.route.js";
import userRoutes from "./routes/user.route.js";
import managerRoutes from "./routes/manager.route.js";
import transactionRouter from "./routes/transaction.route.js";
import systemAccountRouter from "./routes/systemAccount.route.js";
import analyticsRouter from "./routes/analytics.route.js";
import budgetRouter from "./routes/budget.route.js";
import alertRouter from "./routes/alert.route.js";
import chatRoutes from "./routes/chat.route.js";
import notificationRoutes from "./routes/notification.route.js";
import billRoutes from "./routes/bill.route.js";
import { startDailyRecommendationJob } from "./jobs/dailyRecommendation.job.js";

const app = express();
import cors from "cors";
const allowedOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((u) => u.trim().replace(/\/$/, ""))
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.json({
        message: "AI Financial Guide API is running"
    });
});

app.use("/api/auth/users", userAuthRoutes);
app.use("/api/auth/system-users", systemUserAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/manager", managerRoutes);

app.use("/api/transaction", transactionRouter);
app.use("/api/system-account", systemAccountRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/budget", budgetRouter);
app.use("/api/alerts", alertRouter);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bill", billRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

startDailyRecommendationJob();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});