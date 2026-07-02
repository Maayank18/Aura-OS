import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  initSessionHandler,
  getStateHandler,
  wipeStateHandler,
  patchIntakeHandler,
} from '../controllers/stateCtrl.js';

const router = express.Router();
import { requireAuth } from '../middleware/auth.js';

router.post('/init', requireAuth, asyncHandler(initSessionHandler));
router.patch('/:userId/intake', requireAuth, asyncHandler(patchIntakeHandler));
router.get('/:userId', requireAuth, asyncHandler(getStateHandler));
router.delete('/:userId', requireAuth, asyncHandler(wipeStateHandler));

export default router;
