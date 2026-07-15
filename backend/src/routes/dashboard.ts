import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

// GET /dashboard/summary — admin dashboard widgets
router.get('/summary', authenticate, dashboardController.getSummary);

// GET /dashboard/agent — agent dashboard widgets
router.get('/agent', authenticate, dashboardController.getAgentWidgets);

// GET /dashboard/stats — charts / analytics (admin+)
router.get('/stats', authenticate, authorize('admin', 'super_admin'), dashboardController.getStats);

export default router;
