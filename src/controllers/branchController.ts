import { Request, Response } from "express";
import { AppError } from "../utils/errorHandler";
import prisma from "../database/prisma";



export async function createBranch(req: Request, res: Response) {
  try {
    const { name } = req.body;

    const existingBranch = await prisma.branch.findFirst({
      where: { name, deletedAt: null }
    });

    if (existingBranch) {
      throw new AppError("Branch name is already taken", 409);
    }

    const branch = await prisma.branch.create({
      data: { name }
    });

    res.status(201).json({ success: true, data: branch });
  } catch (error) {
    throw error;
  }
}

export async function getAllBranches(_req: Request, res: Response) {
  try {
    const branches = await prisma.branch.findMany({
      where: { deletedAt: null }
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    throw new AppError("Failed to fetch branches", 500);
  }
}

export async function getBranchById(req: Request, res: Response) {
  try {
    const branch = await prisma.branch.findFirst({
      where: { id: parseInt(req.params.id), deletedAt: null }
    });
    
    if (!branch) throw new AppError("Branch not found", 404);
    
    res.json({ success: true, data: branch });
  } catch (error) {
    throw error;
  }
}

export async function updateBranch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const branch = await prisma.branch.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!branch) throw new AppError("Branch not found", 404);

    if (name && name !== branch.name) {
      const existingBranch = await prisma.branch.findFirst({
        where: { name, deletedAt: null }
      });
      if (existingBranch) {
        throw new AppError("Branch name is already taken", 409);
      }
      
      await prisma.branch.update({
        where: { id: parseInt(id) },
        data: { name }
      });
    }

    const updatedBranch = await prisma.branch.findUnique({
      where: { id: parseInt(id) }
    });

    res.json({ success: true, data: updatedBranch });
  } catch (error) {
    throw error;
  }
}

export async function deleteBranch(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!branch) throw new AppError("Branch not found", 404);

    // Check if branch has products or employees
    const [productsCount, employeesCount] = await Promise.all([
      prisma.product.count({
        where: { branchId: parseInt(id), deletedAt: null }
      }),
      prisma.employee.count({
        where: { branchId: parseInt(id), deletedAt: null }
      })
    ]);

    if (productsCount > 0 || employeesCount > 0) {
      throw new AppError("Cannot delete branch with associated products or employees", 400);
    }

    // Soft delete
    await prisma.branch.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Branch deleted successfully" });
  } catch (error) {
    throw error;
  }
}