import { Router } from 'express';
import { getExpenses, getExpenseSummary, createExpense, deleteExpense } from '../controllers/expenseController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

router.get('/summary', getExpenseSummary);
router.get('/', getExpenses);
router.post('/', authorize([Role.ADMIN, Role.CASHIER, Role.OPERATOR], 'action:edit_expense'), createExpense);
router.delete('/:id', authorize([Role.ADMIN], 'action:delete_expense'), deleteExpense);

export default router;
