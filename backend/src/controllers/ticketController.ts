import { Request, Response, NextFunction } from 'express';
import * as ticketService from '../services/ticketService';
import { ticketQuerySchema } from '../validators/ticket';
import type { CreateTicketInput, UpdateTicketInput } from '../validators/ticket';

// ============================================================================
// Ticket CRUD
// ============================================================================

/**
 * POST /tickets
 * Create a new ticket.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body as CreateTicketInput;
    const userId = req.user!.id;

    const ticket = await ticketService.createTicket(data, userId);

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tickets/:id
 * Get a ticket by ID with all relations.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const ticket = await ticketService.getTicket(id);

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tickets
 * List tickets with pagination, filtering, and sorting.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parseResult = ticketQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
      return;
    }
    const result = await ticketService.listTickets(parseResult.data);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /tickets/:id
 * Update a ticket's fields.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const data = req.body as UpdateTicketInput;
    const userId = req.user!.id;

    const ticket = await ticketService.updateTicket(id, data, userId);

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /tickets/:id
 * Soft-delete a ticket. Admin / super_admin only.
 */
export async function deleteTicket(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await ticketService.deleteTicket(id);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Status & Assignment
// ============================================================================

/**
 * PATCH /tickets/:id/status
 * Change ticket status.
 */
export async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status, reason } = req.body;
    const userId = req.user!.id;

    const ticket = await ticketService.statusChange(id, {
      newStatus: status,
      userId,
      reason,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /tickets/:id/assign
 * Assign or reassign a ticket to an agent and/or team.
 */
export async function assign(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { agentId, teamId } = req.body;
    const userId = req.user!.id;

    const ticket = await ticketService.assignTicket(
      id,
      { agentId: agentId ?? null, teamId: teamId ?? null },
      userId,
    );

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Comments
// ============================================================================

/**
 * POST /tickets/:id/comments
 * Add a comment to a ticket.
 */
export async function addComment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { body, authorType, isInternal } = req.body;
    const userId = req.user!.id;

    const comment = await ticketService.addComment(
      id,
      { body, authorType: authorType || 'staff', isInternal },
      userId,
    );

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /tickets/:id/comments
 * Get all comments for a ticket.
 */
export async function getComments(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const comments = await ticketService.getComments(id);

    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Activity
// ============================================================================

/**
 * GET /tickets/:id/activity
 * Get activity log for a ticket.
 */
export async function getActivity(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const activity = await ticketService.getActivity(id);

    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Attachments
// ============================================================================

/**
 * POST /tickets/:id/attachments
 * Add an attachment to a ticket.
 */
export async function addAttachment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    // Supports both multipart upload and JSON payload
    let attachmentData: {
      filename: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      commentId?: string;
    };

    if (req.file) {
      // Uploaded via multer — construct from file metadata
      attachmentData = {
        filename: req.file.originalname,
        fileUrl: (req.file as any).location || `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        commentId: req.body.commentId as string | undefined,
      };
    } else {
      // Sent as JSON body
      attachmentData = {
        filename: req.body.filename as string,
        fileUrl: req.body.fileUrl as string,
        fileSize: req.body.fileSize as number,
        mimeType: req.body.mimeType as string,
        commentId: req.body.commentId as string | undefined,
      };
    }

    const attachment = await ticketService.addAttachment(id, attachmentData, userId);

    res.status(201).json({ attachment });
  } catch (err) {
    next(err);
  }
}

// ============================================================================
// Escalation & Problem Linking
// ============================================================================

/**
 * POST /tickets/:id/escalate
 * Escalate an incident to a problem.
 */
export async function escalate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { problemId } = req.body;
    const userId = req.user!.id;

    const result = await ticketService.escalateTicket(id, userId, problemId);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /tickets/:id/link-problem
 * Link an incident to an existing problem.
 */
export async function linkProblem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { problemId } = req.body;
    const userId = req.user!.id;

    // Log the link action via activity log (the service handles DB linking)
    const result = await ticketService.linkToProblem(id, { problemId });

    // Create activity log entry for the linkage
    const { default: prisma } = await import('../lib/prisma');
    await prisma.activityLog.create({
      data: {
        ticketId: id,
        actorId: userId,
        actorType: 'staff',
        action: 'linked_to_problem',
        newValue: `Linked to problem ${result.problem.ticketNumber ?? problemId}`,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
