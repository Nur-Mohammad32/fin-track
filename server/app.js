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
import testRegister from "./routes/test.route.js";
import transactionRouter from "./routes/transaction.route.js";
import systemAccountRouter from "./routes/systemAccount.route.js";
import testTransactionRouter from './routes/testTransaction.route.js';
import analyticsRouter from "./routes/analytics.route.js";
import budgetRouter from "./routes/budget.route.js";
import alertRouter from "./routes/alert.route.js";
import chatRoutes from "./routes/chat.route.js";

const app = express();

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.json({
        message: "AI Financial Guide API is running"
    });
});

app.use("/api/auth/users", userAuthRoutes);
// app.use("/api/auth/test-register", testRegister);
app.use("/api/auth/system-users", systemUserAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/manager", managerRoutes);

app.use("/api/transaction", transactionRouter);
app.use("/api/system-account", systemAccountRouter);
// app.use("/api/test-transaction", testTransactionRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/budget", budgetRouter);
app.use("/api/alerts", alertRouter);
app.use("/api/chat", chatRoutes);

app.use(errorHandler);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});