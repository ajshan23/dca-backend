import { Request, Response } from "express";
import { AppError } from "../samples/errorHandler";
import prisma from "../database/db";



export async function createCategory(req: Request, res: Response) {
  try {
    const { name, description } = req.body;

    const existingCategory = await prisma.category.findFirst({
      where: { name, deletedAt: null }
    });

    if (existingCategory) {
      throw new AppError("Category name is already taken", 409);
    }

    const category = await prisma.category.create({
      data: { name, description }
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    throw error;
  }
}

export async function getAllCategories(_req: Request, res: Response) {
  try {
    const categories = await prisma.category.findMany({
      where: { deletedAt: null }
    });
    res.json({ success: true, data: categories });
  } catch (error) {
    throw new AppError("Failed to fetch categories", 500);
  }
}

export async function getCategoryById(req: Request, res: Response) {
  try {
    const category = await prisma.category.findFirst({
      where: { id: parseInt(req.params.id), deletedAt: null }
    });
    
    if (!category) throw new AppError("Category not found", 404);
    
    res.json({ success: true, data: category });
  } catch (error) {
    throw error;
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!category) throw new AppError("Category not found", 404);

    const updateData: { name?: string; description?: string } = {};

    if (name && name !== category.name) {
      const existingCategory = await prisma.category.findFirst({
        where: { name, deletedAt: null }
      });
      if (existingCategory) {
        throw new AppError("Category name is already taken", 409);
      }
      updateData.name = name;
    }

    if (description) {
      updateData.description = description;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({ success: true, data: updatedCategory });
  } catch (error) {
    throw error;
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!category) throw new AppError("Category not found", 404);

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId: parseInt(id), deletedAt: null }
    });

    if (productsCount > 0) {
      throw new AppError("Cannot delete category with associated products", 400);
    }

    // Soft delete
    await prisma.category.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    throw error;
  }
}