import express from "express";
import {
  createSavingsGoal,
  deleteSavingsGoal,
  getSavingsGoalsByUserId,
  updateSavingsGoal,
  addMoneyToGoal,
  getSavingsGoalById,
  getSavingsSummaryByUserId,
} from "../controllers/savingsGoalsController.js";

const router = express.Router();

router.get("/:userId", getSavingsGoalsByUserId);
router.get("/summary/:userId", getSavingsSummaryByUserId);
router.get("/details/:id", getSavingsGoalById);
router.post("/", createSavingsGoal);
router.put("/:id", updateSavingsGoal);
router.patch("/:id/add-money", addMoneyToGoal);
router.delete("/:id", deleteSavingsGoal);

export default router;