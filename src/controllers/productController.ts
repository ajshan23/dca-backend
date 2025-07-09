import { Request, Response } from "express";
import { AppError } from "../utils/errorHandler";
import prisma from "@/database/prisma";
import { Prisma } from "@prisma/client";
import QRCode from 'qrcode';

export async function createProduct(req: Request, res: Response) {
  try {
    const { 
      name, 
      model, 
      categoryId, 
      branchId, 
      departmentId,
      warrantyDate, 
      complianceStatus, 
      notes 
    } = req.body;

    // Validate required fields
    if (!name || !model || !categoryId || !branchId) {
      throw new AppError("Missing required fields", 400);
    }

    // Check if category exists
    const categoryExists = await prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null }
    });
    if (!categoryExists) {
      throw new AppError("Category not found", 404);
    }

    // Check if branch exists
    const branchExists = await prisma.branch.findFirst({
      where: { id: branchId, deletedAt: null }
    });
    if (!branchExists) {
      throw new AppError("Branch not found", 404);
    }

    // Check if department exists if provided
    if (departmentId) {
      const departmentExists = await prisma.department.findFirst({
        where: { id: departmentId, deletedAt: null }
      });
      if (!departmentExists) {
        throw new AppError("Department not found", 404);
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        model,
        categoryId,
        branchId,
        departmentId: departmentId || null,
        warrantyDate: warrantyDate ? new Date(warrantyDate) : null,
        complianceStatus: complianceStatus || false,
        notes
      },
      include: {
        category: true,
        branch: true,
        department: true
      }
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new AppError(`A product with this ${field} already exists`, 400);
      }
      if (error.code === 'P2003') {
        throw new AppError("Invalid reference ID provided", 400);
      }
    }
    throw error;
  }
}

export async function getAllProducts(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      includeAssignments,
      categoryId,
      branchId,
      departmentId,
      complianceStatus
    } = req.query;
    
    const where: Prisma.ProductWhereInput = {
      OR: [
        { name: { contains: search as string } },
        { model: { contains: search as string } }
      ],
      deletedAt: null
    };

    // Add optional filters
    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
    }
    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }
    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }
    if (complianceStatus) {
      where.complianceStatus = complianceStatus === 'true';
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        where,
        include: {
          category: true,
          branch: true,
          department: true,
          assignments: includeAssignments === 'true' ? {
            where: {
              status: 'ASSIGNED',
              returnedAt: null
            },
            include: {
              employee: true
            }
          } : false
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    throw new AppError("Failed to fetch products", 500);
  }
}

export async function getAssignedProducts(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '',
      categoryId,
      branchId,
      departmentId
    } = req.query;
    
    const where: Prisma.ProductWhereInput = {
      AND: [
        {
          OR: [
            { name: { contains: search as string } },
            { model: { contains: search as string } }
          ]
        },
        {
          assignments: {
            some: {
              status: 'ASSIGNED',
              returnedAt: null
            }
          }
        }
      ],
      deletedAt: null
    };

    // Add optional filters
    if (categoryId) {
      where.categoryId = parseInt(categoryId as string);
    }
    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }
    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        where,
        include: {
          category: true,
          branch: true,
          department: true,
          assignments: {
            where: {
              status: 'ASSIGNED',
              returnedAt: null
            },
            include: {
              employee: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    throw new AppError("Failed to fetch assigned products", 500);
  }
}

export async function getProductById(req: Request, res: Response) {
  try {
    const product = await prisma.product.findUnique({
      where: { 
        id: parseInt(req.params.id),
        deletedAt: null
      },
      include: {
        category: true,
        branch: true,
        department: true,
        assignments: {
          include: {
            employee: {
              include: {
            
                branch: true
              }
            },
            assignedBy: true
          },
          orderBy: {
            assignedAt: 'desc'
          }
        }
      }
    });

    if (!product) throw new AppError("Product not found", 404);
    res.json({ success: true, data: product });
  } catch (error) {
    throw error;
  }
}

export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { departmentId, ...updateData } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    if (!existingProduct) {
      throw new AppError("Product not found", 404);
    }

    // Validate department if provided
    if (departmentId) {
      const departmentExists = await prisma.department.findFirst({
        where: { id: departmentId, deletedAt: null }
      });
      if (!departmentExists) {
        throw new AppError("Department not found", 404);
      }
    }

    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        departmentId: departmentId !== undefined ? departmentId : existingProduct.departmentId,
        warrantyDate: updateData.warrantyDate ? new Date(updateData.warrantyDate) : existingProduct.warrantyDate
      },
      include: {
        category: true,
        branch: true,
        department: true
      }
    });

    res.json({ success: true, data: product });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new AppError(`A product with this ${field} already exists`, 400);
      }
      if (error.code === 'P2003') {
        throw new AppError("Invalid reference ID provided", 400);
      }
    }
    throw error;
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const productExists = await prisma.product.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    if (!productExists) {
      throw new AppError("Product not found", 404);
    }

    const assignments = await prisma.productAssignment.count({
      where: { productId: parseInt(id) }
    });

    if (assignments > 0) {
      throw new AppError("Cannot delete product with active assignments", 400);
    }

    // Soft delete
    await prisma.product.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    throw error;
  }
}

export const generateProductQr = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw new AppError('Product ID is required', 400);
    }

    // Check if product exists
    const productExists = await prisma.product.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    if (!productExists) {
      throw new AppError("Product not found", 404);
    }

    const productUrl = `${process.env.FRONTEND_URL}/products/view/${id}`;
    
    const qrCodeData = await QRCode.toDataURL(productUrl, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 1
    });

    res.status(200).json({
      success: true,
      qrCodeData,
      productUrl
    });
  } catch (error) {
    console.error('QR Generation Error:', error);
    throw new AppError('Failed to generate QR code', 500);
  }
};