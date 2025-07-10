"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmployee = createEmployee;
exports.getAllEmployees = getAllEmployees;
exports.getEmployeeById = getEmployeeById;
exports.updateEmployee = updateEmployee;
exports.deleteEmployee = deleteEmployee;
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
async function createEmployee(req, res) {
    try {
        const { empId, name, email, department, position, branchId } = req.body;
        // Check if employee ID is already taken
        const existingEmployee = await db_1.default.employee.findFirst({
            where: { empId, deletedAt: null }
        });
        if (existingEmployee) {
            throw new errorHandler_1.AppError("Employee ID is already taken", 409);
        }
        // If branchId is provided, verify it exists
        if (branchId) {
            const branch = await db_1.default.branch.findFirst({
                where: { id: branchId, deletedAt: null }
            });
            if (!branch) {
                throw new errorHandler_1.AppError("Branch not found", 404);
            }
        }
        const employee = await db_1.default.employee.create({
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
    }
    catch (error) {
        throw error;
    }
}
async function getAllEmployees(req, res) {
    try {
        const { search, branchId } = req.query;
        const where = { deletedAt: null };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { empId: { contains: search } },
                { email: { contains: search } }
            ];
        }
        if (branchId) {
            where.branchId = parseInt(branchId);
        }
        const employees = await db_1.default.employee.findMany({
            where,
            include: {
                branch: true
            }
        });
        res.json({ success: true, data: employees });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch employees", 500);
    }
}
async function getEmployeeById(req, res) {
    try {
        const employee = await db_1.default.employee.findFirst({
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
        if (!employee)
            throw new errorHandler_1.AppError("Employee not found", 404);
        res.json({ success: true, data: employee });
    }
    catch (error) {
        throw error;
    }
}
async function updateEmployee(req, res) {
    try {
        const { id } = req.params;
        const { empId, name, email, department, position, branchId } = req.body;
        const employee = await db_1.default.employee.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!employee)
            throw new errorHandler_1.AppError("Employee not found", 404);
        const updateData = {};
        if (empId && empId !== employee.empId) {
            const existingEmployee = await db_1.default.employee.findFirst({
                where: { empId, deletedAt: null }
            });
            if (existingEmployee) {
                throw new errorHandler_1.AppError("Employee ID is already taken", 409);
            }
            updateData.empId = empId;
        }
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (department)
            updateData.department = department;
        if (position)
            updateData.position = position;
        if (branchId) {
            const branch = await db_1.default.branch.findFirst({
                where: { id: branchId, deletedAt: null }
            });
            if (!branch) {
                throw new errorHandler_1.AppError("Branch not found", 404);
            }
            updateData.branchId = branchId;
        }
        const updatedEmployee = await db_1.default.employee.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                branch: true
            }
        });
        res.json({ success: true, data: updatedEmployee });
    }
    catch (error) {
        throw error;
    }
}
async function deleteEmployee(req, res) {
    try {
        const { id } = req.params;
        const employee = await db_1.default.employee.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!employee)
            throw new errorHandler_1.AppError("Employee not found", 404);
        // Check if employee has assignments
        const assignmentsCount = await db_1.default.productAssignment.count({
            where: { employeeId: parseInt(id) }
        });
        if (assignmentsCount > 0) {
            throw new errorHandler_1.AppError("Cannot delete employee with assigned products", 400);
        }
        // Soft delete
        await db_1.default.employee.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ success: true, message: "Employee deleted successfully" });
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=employeeController.js.map