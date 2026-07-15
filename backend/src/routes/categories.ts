import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as categoryController from '../controllers/categoryController';

const router = Router();

// GET /categories — list all categories with subcategories
router.get('/', authenticate, categoryController.list);

// POST /categories — create category (admin+)
router.post('/', authenticate, authorize('admin', 'super_admin'), categoryController.create);

// GET /categories/:id — get category by ID
router.get('/:id', authenticate, categoryController.getById);

// PATCH /categories/:id — update category (admin+)
router.patch('/:id', authenticate, authorize('admin', 'super_admin'), categoryController.update);

// POST /categories/:id/subcategories — create subcategory (admin+)
router.post('/:id/subcategories', authenticate, authorize('admin', 'super_admin'), categoryController.createSubcategory);

// DELETE /categories/:id/subcategories/:subcategoryId — delete subcategory (admin+)
router.delete('/:id/subcategories/:subcategoryId', authenticate, authorize('admin', 'super_admin'), categoryController.deleteSubcategory);

export default router;
