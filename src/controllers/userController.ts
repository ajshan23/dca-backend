import { Request, Response } from "express";
import { AppError } from "../utils/errorHandler";
import bcrypt from "bcryptjs";
import prisma from "@/database/prisma";


const BCRYPT_SALT_ROUNDS = 12;

export async function getAllUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json({ success: true, data: users });
  } catch (error) {
    throw new AppError("Failed to fetch users", 500);
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) throw new AppError("User not authenticated", 401);
    
    const user = await prisma.user.findUnique({
      where: { id: (parseInt(req.user.userId)) },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) throw new AppError("User not found", 404);
    
    res.json({ success: true, data: user });
  } catch (error) {
    throw error;
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) throw new AppError("User not found", 404);
    
    res.json({ success: true, data: user });
  } catch (error) {
    throw error;
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { username, password } = req.body;
    if (!req.user) throw new AppError("User not authenticated", 401);
    // Ensure users can only update their own profile unless they're admin
    if (parseInt(req.user?.userId) !== parseInt(id) ){
      if (req.user?.role !== "ADMIN" && req.user?.role !== "SUPER_ADMIN") {
        throw new AppError("You can only update your own profile", 403);
      }
    }

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) throw new AppError("User not found", 404);

    const updateData: { username?: string; passwordHash?: string } = {};

    if (username) {
      if (username !== user.username) {
        const existingUser = await prisma.user.findFirst({
          where: { username, deletedAt: null }
        });
        if (existingUser) {
          throw new AppError("Username already taken", 409);
        }
        updateData.username = username;
      }
    }

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    throw error;
  }
}

export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) throw new AppError("User not found", 404);

    // Prevent modifying super admins
    if (user.role === "SUPER_ADMIN") {
      throw new AppError("Cannot modify super admin role", 403);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true
      }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    throw error;
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    
    if (!user) throw new AppError("User not found", 404);
    
    // Prevent deleting super admins
    if (user.role === "SUPER_ADMIN") {
      throw new AppError("Cannot delete super admin", 403);
    }

    // Soft delete
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    throw error;
  }
}

export async function checkUsernameAvailability(req: Request, res: Response) {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      throw new AppError("Username is required", 400);
    }

    const existingUser = await prisma.user.findFirst({
      where: { username, deletedAt: null }
    });

    res.json({ available: !existingUser });
  } catch (error) {
    throw error;
  }
}