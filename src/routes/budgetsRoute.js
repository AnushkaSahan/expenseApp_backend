import express from "express";
import {
  getBudgetsByUserId,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetById,
  getBudgetSummaryByUserId,
  getBudgetProgressByUserId,
} from "../controllers/budgetController.js";

const router = express.Router();

router.get("/:userId", getBudgetsByUserId);
router.get("/summary/:userId", getBudgetSummaryByUserId);
router.get("/progress/:userId", getBudgetProgressByUserId);
router.get("/details/:id", getBudgetById);
router.post("/", createBudget);
router.put("/:id", updateBudget);
router.delete("/:id", deleteBudget);

export default router;