import { Queue, Worker, QueueEvents } from 'bullmq';
import config from '../config';
import { sendEmail } from './emailJob';
import { runSlaCheck } from './slaJob';
import prisma from '../lib/prisma';

// ============================================================================
// Redis connection config shared by all queues
// ============================================================================

const connection = {
  host: new URL(config.redis.url).hostname || 'localhost',
  port: parseInt(new URL(config.redis.url).port, 10) || 6379,
};

// ============================================================================
// Queues
// ============================================================================

/**
 * Email dispatch queue.
 * Jobs: { to: string; subject: string; html: string }
 */
export const emailQueue = new Queue('email', { connection });

/**
 * SLA deadline check queue.
 * Jobs: { }
 */
export const slaQueue = new Queue('sla-checks', { connection });

/**
 * Recurrence detection queue.
 * Jobs: { }
 */
export const recurrenceQueue = new Queue('recurrence', { connection });

// ============================================================================
// Workers
// ============================================================================

/**
 * Email Worker — processes email jobs by delegating to sendEmail.
 */
function createEmailWorker(): Worker {
  const worker = new Worker(
    'email',
    async (job) => {
      const { to, subject, html } = job.data as {
        to: string;
        subject: string;
        html: string;
      };

      console.log(`[EmailWorker] Sending email to ${to} — "${subject}"`);
      await sendEmail({ to, subject, html });
      console.log(`[EmailWorker] Email sent to ${to}`);
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

/**
 * SLA Worker — runs periodic SLA deadline checks.
 */
function createSlaWorker(): Worker {
  const worker = new Worker(
    'sla-checks',
    async () => {
      console.log('[SLAWorker] Running SLA check...');
      const result = await runSlaCheck();
      console.log(
        `[SLAWorker] SLA check complete — warnings: ${result.warnings}, breaches: ${result.breaches}`,
      );
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[SLAWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

/**
 * Recurrence Worker — scans tickets for recurring incident patterns.
 * Detects tickets from the same client / category within the configured
 * window and flags potential problems.
 */
function createRecurrenceWorker(): Worker {
  const worker = new Worker(
    'recurrence',
    async () => {
      console.log('[RecurrenceWorker] Running recurrence detection...');

      const windowDays = config.app.recurrenceWindowDays;
      const threshold = config.app.recurrenceThreshold;
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

      // Find client + category combinations with many incidents in the window
      const groups = await prisma.ticket.groupBy({
        by: ['clientId', 'categoryId'],
        where: {
          type: 'incident',
          deletedAt: null,
          createdAt: { gte: since },
          parentProblemId: null, // not already linked to a problem
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: threshold } },
        },
      });

      for (const group of groups) {
        if (group._count.id < threshold) continue;

        // Check if a problem already exists for this combo
        const existingProblem = await prisma.ticket.findFirst({
          where: {
            type: 'problem',
            clientId: group.clientId,
            categoryId: group.categoryId,
            deletedAt: null,
            createdAt: { gte: since },
          },
          select: { id: true, ticketNumber: true },
        });

        if (existingProblem) {
          console.log(
            `[RecurrenceWorker] Problem ${existingProblem.ticketNumber} already exists for client ${group.clientId} / category ${group.categoryId}`,
          );
          continue;
        }

        const client = await prisma.client.findUnique({
          where: { id: group.clientId },
          select: { name: true },
        });

        const category = await prisma.category.findUnique({
          where: { id: group.categoryId },
          select: { name: true },
        });

        console.log(
          `[RecurrenceWorker] Recurring pattern detected: ${group._count.id} incidents for ${client?.name ?? 'unknown'} / ${category?.name ?? 'unknown'}`,
        );

        // Notify admins
        const admins = await prisma.user.findMany({
          where: {
            role: { in: ['admin', 'super_admin'] },
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((admin) => ({
              recipientId: admin.id,
              recipientType: 'staff' as const,
              type: 'escalated' as const,
              message: `Recurring pattern detected: ${group._count.id} incidents for ${client?.name ?? 'unknown'} (${category?.name ?? 'unknown'}) in the last ${windowDays} days. Consider creating a problem ticket.`,
              sentVia: 'in_app' as const,
            })),
          });
        }
      }

      console.log('[RecurrenceWorker] Recurrence detection complete');
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error(`[RecurrenceWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Create and start all BullMQ workers.
 * Call once during application bootstrap (e.g. in server.ts).
 */
export function initializeWorkers(): {
  emailWorker: Worker;
  slaWorker: Worker;
  recurrenceWorker: Worker;
} {
  const emailWorker = createEmailWorker();
  const slaWorker = createSlaWorker();
  const recurrenceWorker = createRecurrenceWorker();

  console.log('[BullMQ] All workers initialized');

  return { emailWorker, slaWorker, recurrenceWorker };
}
