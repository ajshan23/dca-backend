import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../samples/errorHandler";


export function authenticateJWT(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError("Authorization header is required", 401));
  }

  const tokenParts = authHeader.split(" ");

  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    return next(new AppError("Invalid authorization header format", 401));
  }

  const token = tokenParts[1];

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      return next(new AppError("Invalid or expired token", 403));
    }

    // Type assertion to UserAttributes
    req.user = decoded as { userId: string; role: string };
    next();
  });
}
