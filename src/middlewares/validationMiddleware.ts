import { Request, Response, NextFunction } from "express";
import { AnySchema } from "yup";
import { AppError } from "../utils/errorHandler";

export function validateRequest(schema: AnySchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (err) {
      return next(new AppError(err.message! as string, 400));
    }
  };
}
