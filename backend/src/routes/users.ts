import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as userController from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── CRUD ────────────────────────────────────────────────────────────────────

/** GET /users — list users with pagination & filters (admin+) */
router.get('/', authorize('admin', 'super_admin'), userController.list);

/** POST /users/invite — invite a new user (admin+) */
router.post('/invite', authorize('admin', 'super_admin'), userController.invite);

/** GET /users/:id — get a single user */
router.get('/:id', userController.getById);

/** PATCH /users/:id — update user profile/role */
router.patch('/:id', userController.update);

/** DELETE /users/:id — soft-deactivate a user (super_admin only) */
router.delete('/:id', authorize('super_admin'), userController.deleteUser);

export default router;
