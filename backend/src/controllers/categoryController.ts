import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

// ============================================================================
// Category Controller
// ============================================================================

/**
 * GET /categories
 * List all categories with their subcategories.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
        defaultTeam: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tickets: true, articles: true },
        },
      },
    });

    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /categories
 * Create a new category.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, icon, defaultTeamId } = req.body;

    const category = await prisma.category.create({
      data: {
        name,
        icon: icon ?? null,
        defaultTeamId: defaultTeamId ?? null,
      },
      include: {
        defaultTeam: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /categories/:id
 * Get a single category with subcategories.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
        defaultTeam: {
          select: { id: true, name: true, lead: { select: { id: true, firstName: true, lastName: true } } },
        },
        _count: {
          select: { tickets: true, articles: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    res.json({ category });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /categories/:id
 * Update a category.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, icon, defaultTeamId } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(defaultTeamId !== undefined && { defaultTeamId }),
      },
      include: {
        subcategories: { orderBy: { name: 'asc' } },
        defaultTeam: { select: { id: true, name: true } },
      },
    });

    res.json({ category });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /categories/:id/subcategories
 * Create a subcategory within a category.
 */
export async function createSubcategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categoryId = req.params.id as string;
    const { name } = req.body;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const subcategory = await prisma.subcategory.create({
      data: { categoryId, name },
    });

    res.status(201).json({ subcategory });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /categories/:id/subcategories/:subcategoryId
 * Delete a subcategory.
 */
export async function deleteSubcategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const subcategoryId = req.params.subcategoryId as string;

    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });
    if (!subcategory) {
      throw new AppError('Subcategory not found', 404, 'SUBCATEGORY_NOT_FOUND');
    }

    await prisma.subcategory.delete({ where: { id: subcategoryId } });

    res.json({ message: 'Subcategory deleted successfully' });
  } catch (err) {
    next(err);
  }
}
