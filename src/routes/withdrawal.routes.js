import { Router } from 'express';
import { createWithdrawal, updateWithdrawalStatusController } from '../controllers/withdrawal.controller.js';

const router = Router();

router.post('/', createWithdrawal);
router.patch('/:id/status', updateWithdrawalStatusController);

export default router;