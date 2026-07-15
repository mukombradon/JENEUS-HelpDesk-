import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as kbController from '../controllers/kbController';

const router = Router();

// GET /kb/articles — list articles
router.get('/', authenticate, kbController.list);

// POST /kb/articles — create article (admin+)
router.post('/', authenticate, authorize('admin', 'super_admin'), kbController.create);

// GET /kb/articles/:id — get article by ID
router.get('/:id', authenticate, kbController.getById);

// PATCH /kb/articles/:id — update article (admin+)
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), kbController.update);

// DELETE /kb/articles/:id — delete article (admin+)
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), kbController.deleteArticle);

export default router;
