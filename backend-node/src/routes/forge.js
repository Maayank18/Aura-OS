import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  extractWorriesHandler,
  transformSketchHandler,
  destroyWorryHandler,
  vaultWorryHandler,
  getVaultHandler,
  deleteVaultedWorryHandler,
} from '../controllers/forgeCtrl.js';

const router = express.Router();
import { requireAuth } from '../middleware/auth.js';

router.post('/extract', requireAuth, asyncHandler(extractWorriesHandler));
router.post('/transform-sketch', requireAuth, asyncHandler(transformSketchHandler));
router.post('/destroy', requireAuth, asyncHandler(destroyWorryHandler));
router.post('/vault', requireAuth, asyncHandler(vaultWorryHandler));
router.get('/vault/:userId', requireAuth, asyncHandler(getVaultHandler));
router.delete('/vault/:userId/:worryId', requireAuth, asyncHandler(deleteVaultedWorryHandler));

export default router;
