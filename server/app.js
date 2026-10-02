import express from "express";
import connectDB from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";

import userAuthRoutes from "./routes/userAuth.route.js";
import systemUserAuthRoutes from "./routes/systemUserAuth.route.js";
import userRoutes from "./routes/user.route.js";
import managerRoutes from "./routes/manager.route.js";
import testRegister from "./routes/test.route.js";
import transactionRouter from "./routes/transaction.route.js";
import systemAccountRouter from "./routes/systemAccount.route.js";

const app = express();

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.json({
        message: "AI Financial Guide API is running"
    });
});

app.use("/api/auth/users", userAuthRoutes);
app.use("/api/auth/test-register", testRegister);
app.use("/api/auth/system-users", systemUserAuthRoutes);
app.use("/api/user", userRoutes);
app.use("/api/manager", managerRoutes);

app.use("/api/transaction", transactionRouter);
app.use("/api/system-account", systemAccountRouter);

app.use(errorHandler);

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});