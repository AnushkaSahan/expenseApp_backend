import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { initDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import transactionsRoute from "./routes/transactionsRoute.js";
import budgetsRoute from "./routes/budgetsRoute.js";
import savingsGoalsRoute from "./routes/savingsGoalsRoute.js";
import reportsRoute from "./routes/reportsRoute.js";
import syncRoute from "./routes/syncRoute.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(rateLimiter);
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.use("/api/transactions", transactionsRoute);
console.log("Mounted transactions route");
app.use("/api/budgets", budgetsRoute);
console.log("Mounted budgets route");
app.use("/api/savings-goals", savingsGoalsRoute);
console.log("Mounted savings-goals route");
app.use("/api/reports", reportsRoute);
console.log("Mounted reports route");
app.use("/api/sync", syncRoute);
console.log("Mounted sync route");

app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is up and running on PORT: ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server due to DB init error:", err.message, err.stack);
    process.exit(1);
  });