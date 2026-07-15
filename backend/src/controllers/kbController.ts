import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

// ============================================================================
// Knowledge Base Controller
// ============================================================================

/**
 * GET /kb/articles
 * List published articles, with optional search by title.
 * Admins can optionally include unpublished articles.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
    const search = (req.query.search as string) || undefined;
    const categoryId = (req.query.categoryId as string) || undefined;
    const publishedOnly = req.query.published !== 'false';

    const where: any = {};

    // Published filter — admins can see all, regular agents/others see published only
    if (publishedOnly) {
      where.isPublished = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          author: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.knowledgeArticle.count({ where }),
    ]);

    res.json({
      data: articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /kb/articles
 * Create a new knowledge base article.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title, body, categoryId, tags, isPublished } = req.body;
    const userId = req.user!.id;

    const article = await prisma.knowledgeArticle.create({
      data: {
        title,
        body,
        categoryId: categoryId ?? null,
        tags: tags ?? [],
        isPublished: isPublished ?? false,
        createdBy: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.status(201).json({ article });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /kb/articles/:id
 * Get a single article (increments viewCount).
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!article) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    // Increment view count (fire-and-forget)
    await prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ article: { ...article, viewCount: article.viewCount + 1 } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /kb/articles/:id
 * Update an article.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { title, body, categoryId, tags, isPublished } = req.body;

    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    const article = await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(body !== undefined && { body }),
        ...(categoryId !== undefined && { categoryId }),
        ...(tags !== undefined && { tags }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        category: { select: { id: true, name: true } },
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.json({ article });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /kb/articles/:id
 * Delete a knowledge base article.
 */
export async function deleteArticle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const existing = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    await prisma.knowledgeArticle.delete({ where: { id } });

    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    next(err);
  }
}
