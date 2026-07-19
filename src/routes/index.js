import { Router } from 'express';

import userRoutes from './user.routes.js';
import payoutRoutes from './payout.routes.js';
import saleRoutes from './sale.routes.js';
import withdrawalRoutes from './withdrawal.routes.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/payout', payoutRoutes);
router.use('/sale', saleRoutes);
router.use('/withdrawals', withdrawalRoutes);

export default router;