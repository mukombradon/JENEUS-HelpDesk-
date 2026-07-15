import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import * as clientController from '../controllers/clientController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── CRUD ────────────────────────────────────────────────────────────────────

/** GET /clients — list clients with pagination & filters */
router.get('/', clientController.list);

/** POST /clients — create a new client (admin+) */
router.post('/', authorize('admin', 'super_admin'), clientController.create);

/** GET /clients/:id — get a single client with contacts & ticket count */
router.get('/:id', clientController.getById);

/** PATCH /clients/:id — update client (admin+) */
router.patch('/:id', authorize('admin', 'super_admin'), clientController.update);

/** DELETE /clients/:id — soft-delete a client (super_admin only) */
router.delete('/:id', authorize('super_admin'), clientController.deleteClient);

// ── Contacts ────────────────────────────────────────────────────────────────

/** GET /clients/:id/contacts — list contacts for a client */
router.get('/:id/contacts', clientController.getContacts);

/** POST /clients/:id/contacts — create a contact for a client */
router.post('/:id/contacts', clientController.createContact);

/** PATCH /clients/:id/contacts/:contactId — update a contact */
router.patch('/:id/contacts/:contactId', clientController.updateContact);

// ── Tickets ─────────────────────────────────────────────────────────────────

/** GET /clients/:id/tickets — list tickets for a client */
router.get('/:id/tickets', clientController.getTickets);

export default router;
