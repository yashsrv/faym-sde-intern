import { Router } from 'express';

import { triggerAdvancePayout } from '../controllers/payout.controller.js';

const router = Router();

router.post('/advance-payout', triggerAdvancePayout);

export default router;