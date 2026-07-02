import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  breakdownTaskHandler,
  completeQuestHandler,
  abandonTaskHandler,
  getActiveTaskHandler,
  getTaskHistoryHandler,
  syncTimelineHandler,
} from '../controllers/shatterCtrl.js';

const router = express.Router();
import { requireAuth } from '../middleware/auth.js';

router.post('/breakdown', requireAuth, asyncHandler(breakdownTaskHandler));
router.post('/complete', requireAuth, asyncHandler(completeQuestHandler));
router.post('/abandon', requireAuth, asyncHandler(abandonTaskHandler));
router.post('/sync-timeline', requireAuth, asyncHandler(syncTimelineHandler));
router.get('/active/:userId', requireAuth, asyncHandler(getActiveTaskHandler));
router.get('/history/:userId', requireAuth, asyncHandler(getTaskHistoryHandler));

export default router;
