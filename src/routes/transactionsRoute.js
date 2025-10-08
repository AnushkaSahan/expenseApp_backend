import express from "express";
import {
  createTransaction,
  deleteTransactions,
  getSummaryByUserId,
  getTransactionsByUserId,
} from "../controllers/transactionsController.js";

const router = express.Router();

router.get("/:userId", getTransactionsByUserId);

router.post("/", createTransaction);

router.delete("/:id", deleteTransactions);

router.get("/summary/:userId", getSummaryByUserId);

export default router;
