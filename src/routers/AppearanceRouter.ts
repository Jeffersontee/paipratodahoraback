import { Router } from 'express';
import AppearanceController from '../controllers/AppearanceController';

const router = Router();

router.get('/', AppearanceController.getAppearance);
router.post('/', AppearanceController.updateAppearance);

export default router;
