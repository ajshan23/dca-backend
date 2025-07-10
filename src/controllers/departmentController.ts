import { Request, Response } from "express";
import { AppError } from "../samples/errorHandler";
import prisma from "../database/db";

export async function createDepartment(req: Request, res: Response) {
  try {
    const { name, description } = req.body;

    const existingDepartment = await prisma.department.findFirst({
      where: { name, deletedAt: null }
    });

    if (existingDepartment) {
      throw new AppError("Department name is already taken", 409);
    }

    const department = await prisma.department.create({
      data: { name, description }
    });

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    throw error;
  }
}

export async function getAllDepartments(_req: Request, res: Response) {
  try {
    const departments = await prisma.department.findMany({
      where: { deletedAt: null }
    });
    res.json({ success: true, data: departments });
  } catch (error) {
    throw new AppError("Failed to fetch departments", 500);
  }
}

export async function getDepartmentById(req: Request, res: Response) {
  try {
    const department = await prisma.department.findFirst({
      where: { id: parseInt(req.params.id), deletedAt: null }
    });
    
    if (!department) throw new AppError("Department not found", 404);
    
    res.json({ success: true, data: department });
  } catch (error) {
    throw error;
  }
}

export async function updateDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const department = await prisma.department.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!department) throw new AppError("Department not found", 404);

    const updateData: { name?: string; description?: string } = {};

    if (name && name !== department.name) {
      const existingDepartment = await prisma.department.findFirst({
        where: { name, deletedAt: null }
      });
      if (existingDepartment) {
        throw new AppError("Department name is already taken", 409);
      }
      updateData.name = name;
    }

    if (description) {
      updateData.description = description;
    }

    const updatedDepartment = await prisma.department.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ success: true, data: updatedDepartment });
  } catch (error) {
    throw error;
  }
}

export async function deleteDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const department = await prisma.department.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!department) throw new AppError("Department not found", 404);

    // Check if department has products
    const productsCount = await prisma.product.count({
      where: { departmentId: parseInt(id), deletedAt: null }
    });

    

    if (productsCount >  0) {
      throw new AppError("Cannot delete department with associated products ", 400);
    }

    // Soft delete
    await prisma.department.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    throw error;
  }
}