import { Router } from 'express';
import authRoutes from './auth';
import ticketRoutes from './tickets';
import clientRoutes from './clients';
import userRoutes from './users';
import teamRoutes from './teams';
import categoryRoutes from './categories';
import slaRoutes from './sla';
import dashboardRoutes from './dashboard';
import kbRoutes from './kb';
import notificationRoutes from './notifications';
import portalRoutes from './portal';
import reportRoutes from './reports';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/clients', clientRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/categories', categoryRoutes);
router.use('/sla-policies', slaRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/kb/articles', kbRoutes);
router.use('/notifications', notificationRoutes);
router.use('/portal', portalRoutes);
router.use('/reports', reportRoutes);

export default router;
