import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errorHandler";

const prisma = new PrismaClient();

export async function createEmployee(req: Request, res: Response) {
  try {
    const { empId, name, email, department, position, branchId } = req.body;

    // Check if employee ID is already taken
    const existingEmployee = await prisma.employee.findFirst({
      where: { empId, deletedAt: null }
    });

    if (existingEmployee) {
      throw new AppError("Employee ID is already taken", 409);
    }

    // If branchId is provided, verify it exists
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null }
      });
      if (!branch) {
        throw new AppError("Branch not found", 404);
      }
    }

    const employee = await prisma.employee.create({
      data: {
        empId,
        name,
        email,
        department,
        position,
        branchId
      }
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    throw error;
  }
}

export async function getAllEmployees(req: Request, res: Response) {
  try {
    const { search, branchId } = req.query;

    const where: any = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { empId: { contains: search as string } },
        { email: { contains: search as string } }
      ];
    }

    if (branchId) {
      where.branchId = parseInt(branchId as string);
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        branch: true
      }
    });

    res.json({ success: true, data: employees });
  } catch (error) {
    throw new AppError("Failed to fetch employees", 500);
  }
}

export async function getEmployeeById(req: Request, res: Response) {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(req.params.id), deletedAt: null },
      include: {
        branch: true,
        assignments: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!employee) throw new AppError("Employee not found", 404);
    
    res.json({ success: true, data: employee });
  } catch (error) {
    throw error;
  }
}

export async function updateEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { empId, name, email, department, position, branchId } = req.body;

    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!employee) throw new AppError("Employee not found", 404);

    const updateData: any = {};

    if (empId && empId !== employee.empId) {
      const existingEmployee = await prisma.employee.findFirst({
        where: { empId, deletedAt: null }
      });
      if (existingEmployee) {
        throw new AppError("Employee ID is already taken", 409);
      }
      updateData.empId = empId;
    }

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (department) updateData.department = department;
    if (position) updateData.position = position;
    if (branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: branchId, deletedAt: null }
      });
      if (!branch) {
        throw new AppError("Branch not found", 404);
      }
      updateData.branchId = branchId;
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        branch: true
      }
    });

    res.json({ success: true, data: updatedEmployee });
  } catch (error) {
    throw error;
  }
}

export async function deleteEmployee(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findFirst({
      where: { id: parseInt(id), deletedAt: null }
    });
    
    if (!employee) throw new AppError("Employee not found", 404);

    // Check if employee has assignments
    const assignmentsCount = await prisma.productAssignment.count({
      where: { employeeId: parseInt(id) }
    });

    if (assignmentsCount > 0) {
      throw new AppError("Cannot delete employee with assigned products", 400);
    }

    // Soft delete
    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    throw error;
  }
}