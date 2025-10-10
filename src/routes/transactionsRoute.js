import express from 'express';
import { getTransactionsByUserId, getSummaryByUserId, createTransaction, deleteTransaction } from '../controllers/transactionsController.js';

const router = express.Router();

router.get('/:userId', getTransactionsByUserId);
router.get('/summary/:userId', getSummaryByUserId);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

export default router;