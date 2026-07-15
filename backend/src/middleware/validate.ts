import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// ---------------------------------------------------------------------------
// validate — Zod schema validation middleware
//
// On failure it returns 400 with flattened field errors so the client can
// display per-field validation messages.
// On success it replaces req.body with the parsed (and potentially
// transformed / defaulted) data before calling next().
// ---------------------------------------------------------------------------
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: {
          message: 'Validation error',
          details: result.error.flatten(),
        },
      });
      return;
    }

    // Replace req.body with the parsed data (strips unknown fields, applies
    // defaults and transforms defined in the schema).
    req.body = result.data;
    next();
  };
}
