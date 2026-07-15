import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as notificationController from '../controllers/notificationController';

const router = Router();

// GET /notifications — list notifications for current user
router.get('/', authenticate, notificationController.list);

// PATCH /notifications/read-all — mark all as read
router.patch('/read-all', authenticate, notificationController.markAllRead);

// PATCH /notifications/:id/read — mark single as read
router.patch('/:id/read', authenticate, notificationController.markRead);

export default router;
