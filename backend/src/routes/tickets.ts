import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { validate } from '../middleware/validate';
import { createTicketSchema, updateTicketSchema } from '../validators/ticket';
import * as ticketController from '../controllers/ticketController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── CRUD ────────────────────────────────────────────────────────────────────

/** GET /tickets — list tickets with pagination & filters */
router.get('/', ticketController.list);

/** POST /tickets — create a new ticket */
router.post('/', validate(createTicketSchema), ticketController.create);

/** GET /tickets/:id — get a single ticket with all relations */
router.get('/:id', ticketController.getById);

/** PATCH /tickets/:id — update ticket fields */
router.patch('/:id', validate(updateTicketSchema), ticketController.update);

/** DELETE /tickets/:id — soft-delete a ticket (admin only) */
router.delete('/:id', authorize('admin', 'super_admin'), ticketController.deleteTicket);

// ── Status & Assignment ─────────────────────────────────────────────────────

/** PATCH /tickets/:id/status — change ticket status */
router.patch('/:id/status', ticketController.changeStatus);

/** PATCH /tickets/:id/assign — assign / reassign agent or team */
router.patch('/:id/assign', ticketController.assign);

// ── Comments ────────────────────────────────────────────────────────────────

/** POST /tickets/:id/comments — add a comment */
router.post('/:id/comments', ticketController.addComment);

/** GET /tickets/:id/comments — get all comments */
router.get('/:id/comments', ticketController.getComments);

// ── Activity ────────────────────────────────────────────────────────────────

/** GET /tickets/:id/activity — get activity log */
router.get('/:id/activity', ticketController.getActivity);

// ── Attachments ─────────────────────────────────────────────────────────────

/** POST /tickets/:id/attachments — add an attachment */
router.post('/:id/attachments', ticketController.addAttachment);

// ── Escalation & Problem Linking ────────────────────────────────────────────

/** POST /tickets/:id/escalate — escalate incident to problem (agent+) */
router.post(
  '/:id/escalate',
  authorize('agent', 'team_lead', 'admin', 'super_admin'),
  ticketController.escalate,
);

/** POST /tickets/:id/link-problem — link incident to existing problem */
router.post('/:id/link-problem', ticketController.linkProblem);

export default router;
