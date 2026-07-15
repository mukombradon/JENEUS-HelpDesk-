import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as slaController from '../controllers/slaController';

const router = Router();

// GET /sla-policies — list all SLA policies
router.get('/', authenticate, slaController.list);

// POST /sla-policies — create SLA policy (admin+)
router.post('/', authenticate, authorize('admin', 'super_admin'), slaController.create);

// GET /sla-policies/:id — get SLA policy by ID
router.get('/:id', authenticate, slaController.getById);

// PATCH /sla-policies/:id — update SLA policy (admin+)
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), slaController.update);

export default router;
