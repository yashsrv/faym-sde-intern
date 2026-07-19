import { Router } from 'express';
import { reconcileSaleController } from '../controllers/reconciliation.controller.js';

const router = Router();

router.patch('/:id/reconcile', reconcileSaleController);

export default router;