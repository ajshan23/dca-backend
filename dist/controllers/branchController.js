"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBranch = createBranch;
exports.getAllBranches = getAllBranches;
exports.getBranchById = getBranchById;
exports.updateBranch = updateBranch;
exports.deleteBranch = deleteBranch;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("../database/prisma"));
async function createBranch(req, res) {
    try {
        const { name } = req.body;
        const existingBranch = await prisma_1.default.branch.findFirst({
            where: { name, deletedAt: null }
        });
        if (existingBranch) {
            throw new errorHandler_1.AppError("Branch name is already taken", 409);
        }
        const branch = await prisma_1.default.branch.create({
            data: { name }
        });
        res.status(201).json({ success: true, data: branch });
    }
    catch (error) {
        throw error;
    }
}
async function getAllBranches(_req, res) {
    try {
        const branches = await prisma_1.default.branch.findMany({
            where: { deletedAt: null }
        });
        res.json({ success: true, data: branches });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch branches", 500);
    }
}
async function getBranchById(req, res) {
    try {
        const branch = await prisma_1.default.branch.findFirst({
            where: { id: parseInt(req.params.id), deletedAt: null }
        });
        if (!branch)
            throw new errorHandler_1.AppError("Branch not found", 404);
        res.json({ success: true, data: branch });
    }
    catch (error) {
        throw error;
    }
}
async function updateBranch(req, res) {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const branch = await prisma_1.default.branch.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!branch)
            throw new errorHandler_1.AppError("Branch not found", 404);
        if (name && name !== branch.name) {
            const existingBranch = await prisma_1.default.branch.findFirst({
                where: { name, deletedAt: null }
            });
            if (existingBranch) {
                throw new errorHandler_1.AppError("Branch name is already taken", 409);
            }
            await prisma_1.default.branch.update({
                where: { id: parseInt(id) },
                data: { name }
            });
        }
        const updatedBranch = await prisma_1.default.branch.findUnique({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, data: updatedBranch });
    }
    catch (error) {
        throw error;
    }
}
async function deleteBranch(req, res) {
    try {
        const { id } = req.params;
        const branch = await prisma_1.default.branch.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!branch)
            throw new errorHandler_1.AppError("Branch not found", 404);
        const [productsCount, employeesCount] = await Promise.all([
            prisma_1.default.product.count({
                where: { branchId: parseInt(id), deletedAt: null }
            }),
            prisma_1.default.employee.count({
                where: { branchId: parseInt(id), deletedAt: null }
            })
        ]);
        if (productsCount > 0 || employeesCount > 0) {
            throw new errorHandler_1.AppError("Cannot delete branch with associated products or employees", 400);
        }
        await prisma_1.default.branch.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ success: true, message: "Branch deleted successfully" });
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=branchController.js.map