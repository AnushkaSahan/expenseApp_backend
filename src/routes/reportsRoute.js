import express from "express";
import {
  getMonthlyExpenditureAnalysis,
  getBudgetAdherence,
  getSavingsGoalProgress,
  getCategoryExpenseDistribution,
  getForecastedSavingsTrends,
  getAllReportsSummary,
} from "../controllers/reportsController.js";

const router = express.Router();

router.get("/summary/:userId", getAllReportsSummary);
router.get("/monthly-expenditure/:userId", getMonthlyExpenditureAnalysis);
router.get("/budget-adherence/:userId", getBudgetAdherence);
router.get("/savings-progress/:userId", getSavingsGoalProgress);
router.get("/category-distribution/:userId", getCategoryExpenseDistribution);
router.get("/savings-forecast/:userId", getForecastedSavingsTrends);

export default router;