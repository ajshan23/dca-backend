import { Request, Response } from "express";
import { AppError } from "../utils/errorHandler";
import prisma from "@/database/prisma";
import { Prisma } from "@prisma/client";


export async function assignProduct(req: Request, res: Response) {
  const { productId, employeeId, expectedReturnAt, notes } = req.body;
  console.log(req.user);
  
  const assignedById = req.user?.id;

  // Validate required fie  lds
  if (!assignedById) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (!productId || !employeeId) {
    return res.status(400).json({ success: false, message: "Product ID and Employee ID are required" });
  }

  try {
    // Verify product exists, is not deleted, and not already assigned
    const product = await prisma.product.findFirst({
      where: { id: productId },
      include: {
        assignments: {
          where: {
            status: "ASSIGNED",
            returnedAt: null
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found or is deleted" });
    }
    if (product.assignments.length > 0) {
      return res.status(400).json({ success: false, message: "Product is already assigned to someone" });
    }

    // Verify employee exists and is not deleted
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId}
    });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found or is deleted" });
    }

    // Validate expected return date if provided
    if (expectedReturnAt && new Date(expectedReturnAt) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: "Expected return date cannot be in the past" 
      });
    }

    const assignment = await prisma.productAssignment.create({
      data: {
        productId,
        employeeId,
        assignedById,
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
        notes,
        status: "ASSIGNED"
      },
      include: {
        product: {
          include: {
            category: true,
            branch: true
          }
        },
        employee: true,
        assignedBy: true
      }
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Assignment error:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          success: false, 
          message: "Assignment conflict - this combination already exists" 
        });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid ID provided - product or employee doesn't exist" 
        });
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Failed to assign product",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
export async function returnProduct(req: Request, res: Response) {
  try {
    const { assignmentId } = req.params;
    const { condition, notes } = req.body;

    const assignment = await prisma.productAssignment.findUnique({
      where: { id: parseInt(assignmentId) }
    });

    if (!assignment) throw new AppError("Assignment not found", 404);
    if (assignment.status === "RETURNED") {
      throw new AppError("Product already returned", 400);
    }

    const updatedAssignment = await prisma.productAssignment.update({
      where: { id: parseInt(assignmentId) },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        condition: condition || null,
        notes: notes || assignment.notes
      },
      include: {
        product: true,
        employee: true,
        assignedBy: true
      }
    });

    res.json({ success: true, data: updatedAssignment });
  } catch (error) {
    throw error;
  }
}

export async function getActiveAssignments(req: Request, res: Response) {
  try {
    // Optional query parameters for pagination
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    // Validate pagination parameters
    if (isNaN(pageNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number"
      });
    }

    if (isNaN(limitNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit value"
      });
    }

    const [assignments, total] = await prisma.$transaction([
      prisma.productAssignment.findMany({
        where: {
          status: "ASSIGNED",
          returnedAt: null // Only filter by these fields
        },
        include: {
          product: {
            include: {
              category: true,
              branch: true
            }
          },
          employee: true,
          assignedBy: true
        },
        orderBy: {
          assignedAt: "desc"
        },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber
      }),
      prisma.productAssignment.count({
        where: {
          status: "ASSIGNED",
          returnedAt: null // Only filter by these fields
        }
      })
    ]);

    return res.json({
      success: true,
      data: assignments,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    console.error('Error fetching active assignments:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({
        success: false,
        message: "Database error occurred"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch active assignments",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
export async function getAssignmentHistory(req: Request, res: Response) {
  try {
    const assignments = await prisma.productAssignment.findMany({
      where: {
        NOT: {
          returnedAt: null
        }
      },
      include: {
        product: true,
        employee: true
      },
      orderBy: {
        returnedAt: "desc"
      }
    });
    res.json({ success: true, data: assignments });
  } catch (error) {
    throw new AppError("Failed to fetch assignment history", 500);
  }
}

export async function getEmployeeAssignments(req: Request, res: Response) {
  try {
    const { employeeId } = req.params;
    const assignments = await prisma.productAssignment.findMany({
      where: {
        employeeId: parseInt(employeeId)
      },
      include: {
        product: true
      },
      orderBy: {
        assignedAt: "desc"
      }
    });
    res.json({ success: true, data: assignments });
  } catch (error) {
    throw new AppError("Failed to fetch employee assignments", 500);
  }
}

export async function updateAssignment(req: Request, res: Response) {
  try {
    const { assignmentId } = req.params;
    const { expectedReturnAt, notes } = req.body;

    const assignment = await prisma.productAssignment.findUnique({
      where: { id: parseInt(assignmentId) }
    });

    if (!assignment) throw new AppError("Assignment not found", 404);
    if (assignment.status === "RETURNED") {
      throw new AppError("Cannot modify returned assignments", 400);
    }

    const updatedAssignment = await prisma.productAssignment.update({
      where: { id: parseInt(assignmentId) },
      data: {
        expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
        notes
      },
      include: {
        product: true,
        employee: true,
        assignedBy: true
      }
    });

    res.json({ success: true, data: updatedAssignment });
  } catch (error) {
    throw error;
  }
}

export async function bulkAssignProducts(req: Request, res: Response) {
  try {
    const { assignments } = req.body;
    const assignedById = req.user?.id;

    if (!Array.isArray(assignments)) {
      throw new AppError("Assignments must be an array", 400);
    }

    if (!assignedById) {
      throw new AppError("Authentication required", 401);
    }

    // Process assignments in a transaction
    const results = await prisma.$transaction(
      assignments.map(({ productId, employeeId, expectedReturnAt, notes }) => {
        return prisma.productAssignment.create({
          data: {
            productId,
            employeeId,
            assignedById,
            expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
            notes,
            status: "ASSIGNED"
          },
          include: {
            product: true,
            employee: true,
            assignedBy: true
          }
        });
      })
    );

    res.status(201).json({ success: true, data: results });
  } catch (error) {
    throw error;
  }
}
export async function getProductAssignments(req: Request, res: Response) {
  const { productId } = req.params;
  
  if (!productId) {
    return res.status(400).json({ 
      success: false, 
      message: "Product ID is required" 
    });
  }

  try {
    const assignments = await prisma.productAssignment.findMany({
      where: {
        productId: parseInt(productId)
      },
      include: {
        product: {
          include: {
            category: true,
            branch: true
          }
        },
        employee: true,
        assignedBy: true
      },
      orderBy: {
        assignedAt: "desc"
      }
    });

    if (!assignments || assignments.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No assignments found for this product" 
      });
    }

    return res.json({ 
      success: true, 
      data: assignments 
    });
  } catch (error) {
    console.error('Error fetching product assignments:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid product ID format" 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch product assignments",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

