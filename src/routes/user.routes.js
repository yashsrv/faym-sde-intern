import { Router } from 'express';
import { getUserBalanceController, getUserTransactionsController } from '../controllers/user.controller.js';

const router = Router();

router.get('/:userId/balance', getUserBalanceController);
router.get('/:userId/transactions', getUserTransactionsController);

export default router;