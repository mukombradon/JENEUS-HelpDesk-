import prisma from '../lib/prisma';
import { getIO } from '../socket';

// ---------------------------------------------------------------------------
// SLA Check — Scan all open / in-progress tickets for deadlines
// ---------------------------------------------------------------------------

/**
 * Run SLA deadline checks against all non-closed, non-pending tickets.
 * - If < 30 % time remaining before a deadline      → fire warning notification
 * - If past deadline                                 → mark slaBreach = true, fire breach notification
 * - Tickets in 'pending' status are skipped          (SLA paused)
 * - Tickets in 'closed' / 'cancelled' are skipped    (terminal states)
 */
export async function runSlaCheck(): Promise<{
  warnings: number;
  breaches: number;
  skipped: number;
}> {
  const now = new Date();

  const tickets = await prisma.ticket.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['closed', 'cancelled', 'pending'] },
      // Only consider tickets that have at least one SLA deadline set
      OR: [
        { responseDueAt: { not: null } },
        { resolutionDueAt: { not: null } },
      ],
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      slaBreach: true,
      responseDueAt: true,
      resolutionDueAt: true,
      createdAt: true,
      assignedAgentId: true,
      client: {
        select: { name: true },
      },
    },
  });

  let warnings = 0;
  let breaches = 0;
  let skipped = 0;

  const io = getIO();

  for (const ticket of tickets) {
    // --- Response SLA ---
    if (ticket.responseDueAt) {
      const totalWindow = ticket.responseDueAt.getTime() - ticket.createdAt.getTime();
      const remaining = ticket.responseDueAt.getTime() - now.getTime();

      if (remaining <= 0) {
        // Breach!
        if (!ticket.slaBreach) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { slaBreach: true },
          });
          breaches++;

          const message = `SLA Breach: Response overdue for ${ticket.ticketNumber} (${ticket.client.name})`;
          await createSlaNotification(ticket.id, message, 'sla_breached', ticket.assignedAgentId);
          io.to(`ticket:${ticket.id}`).emit('sla:breached', {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            type: 'response',
            message,
          });
        }
      } else if (totalWindow > 0 && remaining / totalWindow < 0.3) {
        // Warning threshold (< 30 % remaining)
        warnings++;
        const message = `SLA Warning: Response due soon for ${ticket.ticketNumber} (${ticket.client.name}) — ${Math.ceil(remaining / 60_000)} min remaining`;
        await createSlaNotification(ticket.id, message, 'sla_warning', ticket.assignedAgentId);
        io.to(`ticket:${ticket.id}`).emit('sla:warning', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          type: 'response',
          remainingMinutes: Math.ceil(remaining / 60_000),
          message,
        });
      }
    }

    // --- Resolution SLA ---
    if (ticket.resolutionDueAt) {
      const totalWindow = ticket.resolutionDueAt.getTime() - ticket.createdAt.getTime();
      const remaining = ticket.resolutionDueAt.getTime() - now.getTime();

      if (remaining <= 0) {
        if (!ticket.slaBreach) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { slaBreach: true },
          });
          // Only count once per ticket even if both response and resolution breach
          if (!ticket.responseDueAt || ticket.responseDueAt <= now || ticket.slaBreach) {
            // Already counted as breach above — just ensure notification
          } else {
            breaches++;
          }

          const message = `SLA Breach: Resolution overdue for ${ticket.ticketNumber} (${ticket.client.name})`;
          await createSlaNotification(ticket.id, message, 'sla_breached', ticket.assignedAgentId);
          io.to(`ticket:${ticket.id}`).emit('sla:breached', {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            type: 'resolution',
            message,
          });
        }
      } else if (totalWindow > 0 && remaining / totalWindow < 0.3) {
        warnings++;
        const message = `SLA Warning: Resolution due soon for ${ticket.ticketNumber} (${ticket.client.name}) — ${Math.ceil(remaining / 60_000)} min remaining`;
        await createSlaNotification(ticket.id, message, 'sla_warning', ticket.assignedAgentId);
        io.to(`ticket:${ticket.id}`).emit('sla:warning', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          type: 'resolution',
          remainingMinutes: Math.ceil(remaining / 60_000),
          message,
        });
      }
    }
  }

  return { warnings, breaches, skipped };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function createSlaNotification(
  ticketId: string,
  message: string,
  type: 'sla_warning' | 'sla_breached',
  assignedAgentId: string | null,
): Promise<void> {
  const recipientIds: string[] = [];
  if (assignedAgentId) recipientIds.push(assignedAgentId);

  // Also fetch team / admin users if no agent assigned
  if (!assignedAgentId) {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['admin', 'super_admin'] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    recipientIds.push(...admins.map((a) => a.id));
  }

  if (recipientIds.length === 0) return;

  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipientId,
      recipientType: 'staff' as const,
      ticketId,
      type,
      message,
      sentVia: 'in_app' as const,
    })),
  });
}
