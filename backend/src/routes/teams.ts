import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as teamController from '../controllers/teamController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── CRUD ────────────────────────────────────────────────────────────────────

/** GET /teams — list all teams */
router.get('/', teamController.list);

/** POST /teams — create a new team (admin+) */
router.post('/', authorize('admin', 'super_admin'), teamController.create);

/** PATCH /teams/:id — update a team (admin+) */
router.patch('/:id', authorize('admin', 'super_admin'), teamController.update);

/** GET /teams/:id — get a single team with members */
router.get('/:id', teamController.getById);

export default router;
