import { Router } from 'express';
import * as portalController from '../controllers/portalController';

const router = Router();

// POST /portal/login — client contact login (no auth required)
router.post('/login', portalController.portalLogin);

// Protected portal routes (require portal JWT)
router.get('/tickets', portalController.portalAuth, portalController.listTickets);
router.post('/tickets', portalController.portalAuth, portalController.createTicket);
router.get('/tickets/:id', portalController.portalAuth, portalController.getTicketById);
router.post('/tickets/:id/comments', portalController.portalAuth, portalController.addComment);
router.post('/tickets/:id/reopen', portalController.portalAuth, portalController.reopenTicket);
router.post('/tickets/:id/confirm-resolved', portalController.portalAuth, portalController.confirmResolved);

export default router;
