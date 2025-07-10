"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDepartment = createDepartment;
exports.getAllDepartments = getAllDepartments;
exports.getDepartmentById = getDepartmentById;
exports.updateDepartment = updateDepartment;
exports.deleteDepartment = deleteDepartment;
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
async function createDepartment(req, res) {
    try {
        const { name, description } = req.body;
        const existingDepartment = await db_1.default.department.findFirst({
            where: { name, deletedAt: null }
        });
        if (existingDepartment) {
            throw new errorHandler_1.AppError("Department name is already taken", 409);
        }
        const department = await db_1.default.department.create({
            data: { name, description }
        });
        res.status(201).json({ success: true, data: department });
    }
    catch (error) {
        throw error;
    }
}
async function getAllDepartments(_req, res) {
    try {
        const departments = await db_1.default.department.findMany({
            where: { deletedAt: null }
        });
        res.json({ success: true, data: departments });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch departments", 500);
    }
}
async function getDepartmentById(req, res) {
    try {
        const department = await db_1.default.department.findFirst({
            where: { id: parseInt(req.params.id), deletedAt: null }
        });
        if (!department)
            throw new errorHandler_1.AppError("Department not found", 404);
        res.json({ success: true, data: department });
    }
    catch (error) {
        throw error;
    }
}
async function updateDepartment(req, res) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const department = await db_1.default.department.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!department)
            throw new errorHandler_1.AppError("Department not found", 404);
        const updateData = {};
        if (name && name !== department.name) {
            const existingDepartment = await db_1.default.department.findFirst({
                where: { name, deletedAt: null }
            });
            if (existingDepartment) {
                throw new errorHandler_1.AppError("Department name is already taken", 409);
            }
            updateData.name = name;
        }
        if (description) {
            updateData.description = description;
        }
        const updatedDepartment = await db_1.default.department.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json({ success: true, data: updatedDepartment });
    }
    catch (error) {
        throw error;
    }
}
async function deleteDepartment(req, res) {
    try {
        const { id } = req.params;
        const department = await db_1.default.department.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!department)
            throw new errorHandler_1.AppError("Department not found", 404);
        // Check if department has products
        const productsCount = await db_1.default.product.count({
            where: { departmentId: parseInt(id), deletedAt: null }
        });
        if (productsCount > 0) {
            throw new errorHandler_1.AppError("Cannot delete department with associated products ", 400);
        }
        // Soft delete
        await db_1.default.department.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ success: true, message: "Department deleted successfully" });
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=departmentController.js.map