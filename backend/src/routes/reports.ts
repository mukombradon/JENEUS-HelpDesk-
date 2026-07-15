import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as reportController from '../controllers/reportController';

const router = Router();

// GET /reports/sla — SLA compliance report
router.get('/sla', authenticate, reportController.getSlaReport);

// GET /reports/volume — ticket volume report
router.get('/volume', authenticate, reportController.getVolumeReport);

// GET /reports/agents — agent performance report
router.get('/agents', authenticate, authorize('admin', 'super_admin'), reportController.getAgentReport);

// GET /reports/problems — problem frequency report
router.get('/problems', authenticate, authorize('admin', 'super_admin'), reportController.getProblemReport);

export default router;
