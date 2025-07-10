import { Request, Response } from "express";
import { AppError } from "../samples/errorHandler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../database/db";


const BCRYPT_SALT_ROUNDS = 12;

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      throw new AppError("Username and password are required", 400);
    }

    const user = await prisma.user.findFirst({
      where: { username, deletedAt: null },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true
      }
    });

    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || "your-secret-your_secure_jwt_secret_32chars_min",
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }
    });
  } catch (error) {
    throw error;
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const currentUser = req.user;
    const { username, password, role = "USER" } = req.body;

    // Validate input
    if (!username || !password) {
      throw new AppError("Username and password are required", 400);
    }

    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }

    // Check permissions
    if (role === "ADMIN" && currentUser.role !== "SUPER_ADMIN") {
      throw new AppError("Only super admin can create admin", 403);
    }

    if (role === "SUPER_ADMIN") {
      throw new AppError("Cannot create super admin via API", 403);
    }

    const existingUser = await prisma.user.findFirst({
      where: { username, deletedAt: null }
    });
    if (existingUser) {
      throw new AppError("Username is already taken", 409);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    throw error;
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { username, password, role } = req.body;

    const user = await prisma.user.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Prevent editing super_admin unless current user is super_admin
    if (
      user.role === "SUPER_ADMIN" &&
      req.user?.role !== "SUPER_ADMIN"
    ) {
      throw new AppError("Cannot modify super admin", 403);
    }

    const updateData: {
      username?: string;
      passwordHash?: string;
      role?: "ADMIN" | "USER"; // SUPER_ADMIN can't be set via API
    } = {};

    if (username && username !== user.username) {
      const existingUser = await prisma.user.findFirst({
        where: { username, deletedAt: null }
      });
      if (existingUser) {
        throw new AppError("Username already taken", 409);
      }
      updateData.username = username;
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    if (role && role !== user.role) {
      // Only super admin can change roles to admin
      if (role === "ADMIN" && req.user?.role !== "SUPER_ADMIN") {
        throw new AppError("Only super admin can assign admin role", 403);
      }
      updateData.role = role;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    throw error;
  }
}