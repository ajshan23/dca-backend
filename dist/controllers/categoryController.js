"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCategory = createCategory;
exports.getAllCategories = getAllCategories;
exports.getCategoryById = getCategoryById;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
async function createCategory(req, res) {
    try {
        const { name, description } = req.body;
        const existingCategory = await db_1.default.category.findFirst({
            where: { name, deletedAt: null }
        });
        if (existingCategory) {
            throw new errorHandler_1.AppError("Category name is already taken", 409);
        }
        const category = await db_1.default.category.create({
            data: { name, description }
        });
        res.status(201).json({ success: true, data: category });
    }
    catch (error) {
        throw error;
    }
}
async function getAllCategories(_req, res) {
    try {
        const categories = await db_1.default.category.findMany({
            where: { deletedAt: null }
        });
        res.json({ success: true, data: categories });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch categories", 500);
    }
}
async function getCategoryById(req, res) {
    try {
        const category = await db_1.default.category.findFirst({
            where: { id: parseInt(req.params.id), deletedAt: null }
        });
        if (!category)
            throw new errorHandler_1.AppError("Category not found", 404);
        res.json({ success: true, data: category });
    }
    catch (error) {
        throw error;
    }
}
async function updateCategory(req, res) {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const category = await db_1.default.category.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!category)
            throw new errorHandler_1.AppError("Category not found", 404);
        const updateData = {};
        if (name && name !== category.name) {
            const existingCategory = await db_1.default.category.findFirst({
                where: { name, deletedAt: null }
            });
            if (existingCategory) {
                throw new errorHandler_1.AppError("Category name is already taken", 409);
            }
            updateData.name = name;
        }
        if (description) {
            updateData.description = description;
        }
        const updatedCategory = await db_1.default.category.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json({ success: true, data: updatedCategory });
    }
    catch (error) {
        throw error;
    }
}
async function deleteCategory(req, res) {
    try {
        const { id } = req.params;
        const category = await db_1.default.category.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!category)
            throw new errorHandler_1.AppError("Category not found", 404);
        // Check if category has products
        const productsCount = await db_1.default.product.count({
            where: { categoryId: parseInt(id), deletedAt: null }
        });
        if (productsCount > 0) {
            throw new errorHandler_1.AppError("Cannot delete category with associated products", 400);
        }
        // Soft delete
        await db_1.default.category.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ success: true, message: "Category deleted successfully" });
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=categoryController.js.map