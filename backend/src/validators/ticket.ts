import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums matching Prisma schema
// ---------------------------------------------------------------------------

export const ticketTypeEnum = z.enum(['incident', 'problem']);
export const ticketStatusEnum = z.enum([
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed',
  'cancelled',
]);
export const ticketPriorityEnum = z.enum(['critical', 'high', 'medium', 'low']);
export const slaStatusEnum = z.enum(['ok', 'warning', 'breached']);

// ---------------------------------------------------------------------------
// createTicketSchema
// ---------------------------------------------------------------------------
export const createTicketSchema = z.object({
  type: ticketTypeEnum,
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().min(1, 'Description is required'),
  clientId: z.string().uuid('Invalid client ID'),
  contactId: z.string().uuid('Invalid contact ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  subcategoryId: z.string().uuid('Invalid subcategory ID').optional(),
  priority: ticketPriorityEnum,
  tags: z.array(z.string()).optional(),
  assignedAgentId: z.string().uuid('Invalid agent ID').optional(),
  assignedTeamId: z.string().uuid('Invalid team ID').optional(),
});

// ---------------------------------------------------------------------------
// updateTicketSchema
// ---------------------------------------------------------------------------
export const updateTicketSchema = z.object({
  type: ticketTypeEnum.optional(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().min(1).optional(),
  clientId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  priority: ticketPriorityEnum.optional(),
  tags: z.array(z.string()).optional(),
  assignedAgentId: z.string().uuid().optional(),
  assignedTeamId: z.string().uuid().optional(),
  status: ticketStatusEnum.optional(),
  resolution: z.string().optional(),
});

// ---------------------------------------------------------------------------
// ticketQuerySchema — used for query string parsing (GET /tickets)
// ---------------------------------------------------------------------------
export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  status: ticketStatusEnum.optional(),
  type: ticketTypeEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  clientId: z.string().uuid().optional(),
  assignedAgentId: z.string().uuid().optional(),
  assignedTeamId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
  slaStatus: slaStatusEnum.optional(),
  tags: z.string().optional(), // comma-separated
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
