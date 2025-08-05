import { Request, Response } from "express";
import { AppError } from "../samples/errorHandler";
import prisma from "../database/db";
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

    if (!name || !model || !categoryId || !branchId) {
      throw new AppError("Name, model, category and branch are required", 400);
    }

    // Validate references
    const [category, branch] = await Promise.all([
      prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } }),
      prisma.branch.findFirst({ where: { id: branchId, deletedAt: null } })
    ]);

    if (!category) throw new AppError("Category not found", 404);
    if (!branch) throw new AppError("Branch not found", 404);

    if (departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: departmentId, deletedAt: null }
      });
      if (!department) throw new AppError("Department not found", 404);
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
      select: {
        id: true,
        name: true,
        model: true,
        category: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        warrantyDate: true,
        complianceStatus: true,
        createdAt: true
      }
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    throw error;
  }
}

export async function getAllProducts(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      categoryId, 
      branchId, 
      departmentId,
      complianceStatus 
    } = req.query;
    
    const where: any = { deletedAt: null };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { model: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (branchId) where.branchId = parseInt(branchId as string);
    if (departmentId) where.departmentId = parseInt(departmentId as string);
    if (complianceStatus) where.complianceStatus = complianceStatus === 'true';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        where,
        select: {
          id: true,
          name: true,
          model: true,
          category: {
            select: {
              id: true,
              name: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          },
          warrantyDate: true,
          complianceStatus: true,
          createdAt: true,
          assignments: {
            select: {
              id: true,
              assignedAt: true,
              expectedReturnAt: true,
              returnedAt: true,
              employee: {
                select: {
                  id: true,
                  name: true,
                  empId: true
                }
              }
            },
            where: {
              returnedAt: null
            },
            orderBy: {
              assignedAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.product.count({ where })
    ]);

    const transformedProducts = products.map(product => ({
      ...product,
      isAssigned: product.assignments.length > 0,
      currentAssignment: product.assignments[0] || null
    }));

    res.json({
      success: true,
      data: transformedProducts,
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

export async function getProductById(req: Request, res: Response) {
  try {
    const product = await prisma.product.findUnique({
      where: { 
        id: parseInt(req.params.id),
        deletedAt: null 
      },
      select: {
        id: true,
        name: true,
        model: true,
        category: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        warrantyDate: true,
        complianceStatus: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          orderBy: {
            assignedAt: 'desc'
          },
          select: {
            id: true,
            status: true,
            assignedAt: true,
            returnedAt: true,
            condition:true,
            employee: {
              select: {
                id: true,
                name: true
              }
            },
            assignedBy: {
              select: {
                id: true,
                username: true
              }
            }
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

export async function getAssignedProducts(_req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        assignments: {
          some: {
            returnedAt: null
          }
        }
      },
      select: {
        id: true,
        name: true,
        model: true,
        category: {
          select: {
            name: true
          }
        },
        assignments: {
          where: {
            returnedAt: null
          },
          select: {
            employee: {
              select: {
                name: true
              }
            },
            assignedAt: true
          }
        }
      }
    });

    res.json({ success: true, data: products });
  } catch (error) {
    throw new AppError("Failed to fetch assigned products", 500);
  }
}



export async function updateProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, model, categoryId, branchId, departmentId, warrantyDate, complianceStatus, notes } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!product) throw new AppError("Product not found", 404);

    // Validate references if changed
    if (categoryId && categoryId !== product.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, deletedAt: null }
      });
      if (!category) throw new AppError("Category not found", 404);
    }

    if (branchId && branchId !== product.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null }
      });
      if (!branch) throw new AppError("Branch not found", 404);
    }

    if (departmentId && departmentId !== product.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: departmentId, deletedAt: null }
      });
      if (!department) throw new AppError("Department not found", 404);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name: name || product.name,
        model: model || product.model,
        categoryId: categoryId || product.categoryId,
        branchId: branchId || product.branchId,
        departmentId: departmentId !== undefined ? departmentId : product.departmentId,
        warrantyDate: warrantyDate ? new Date(warrantyDate) : product.warrantyDate,
        complianceStatus: complianceStatus !== undefined ? complianceStatus : product.complianceStatus,
        notes: notes || product.notes
      },
      select: {
        id: true,
        name: true,
        model: true,
        category: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        warrantyDate: true,
        complianceStatus: true,
        updatedAt: true
      }
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    throw error;
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            assignments: true
          }
        }
      }
    });
    
    if (!product) throw new AppError("Product not found", 404);

    if (product._count.assignments > 0) {
      throw new AppError("Cannot delete product with active assignments", 400);
    }

    await prisma.product.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    throw error;
  }
}




export async function generateProductQr(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      throw new Error("Invalid product ID");
    }

    const productUrl = `${process.env.FRONTEND_URL}/products-view/${id}`;
    
    // Generate QR code with proper error handling
    const qrCode = await new Promise<string>((resolve, reject) => {
      QRCode.toDataURL(productUrl, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 1
      }, (err, url) => {
        if (err) return reject(err);
        resolve(url);
      });
    });
    res.json({ 
      success: true,
      qrCode // Send the data URL directly
    });

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate QR code'
    });
  }
}