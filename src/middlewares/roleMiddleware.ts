import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";
import { UserRole } from "@/constants/roles";


export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (!roles.includes(req.user.role as UserRole)) {
      throw new AppError("Insufficient permissions", 403);
    }

    next();
  };
}