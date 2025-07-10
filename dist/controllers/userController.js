"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getCurrentUser = getCurrentUser;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.updateUserRole = updateUserRole;
exports.deleteUser = deleteUser;
exports.checkUsernameAvailability = checkUsernameAvailability;
const errorHandler_1 = require("../samples/errorHandler");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../database/db"));
const BCRYPT_SALT_ROUNDS = 12;
async function getAllUsers(_req, res) {
    try {
        const users = await db_1.default.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({ success: true, data: users });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch users", 500);
    }
}
async function getCurrentUser(req, res) {
    try {
        if (!req.user)
            throw new errorHandler_1.AppError("User not authenticated", 401);
        const user = await db_1.default.user.findUnique({
            where: { id: (parseInt(req.user.userId)) },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user)
            throw new errorHandler_1.AppError("User not found", 404);
        res.json({ success: true, data: user });
    }
    catch (error) {
        throw error;
    }
}
async function getUserById(req, res) {
    try {
        const user = await db_1.default.user.findUnique({
            where: { id: parseInt(req.params.id) },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user)
            throw new errorHandler_1.AppError("User not found", 404);
        res.json({ success: true, data: user });
    }
    catch (error) {
        throw error;
    }
}
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { username, password } = req.body;
        if (!req.user)
            throw new errorHandler_1.AppError("User not authenticated", 401);
        // Ensure users can only update their own profile unless they're admin
        if (parseInt(req.user?.userId) !== parseInt(id)) {
            if (req.user?.role !== "ADMIN" && req.user?.role !== "SUPER_ADMIN") {
                throw new errorHandler_1.AppError("You can only update your own profile", 403);
            }
        }
        const user = await db_1.default.user.findUnique({ where: { id: parseInt(id) } });
        if (!user)
            throw new errorHandler_1.AppError("User not found", 404);
        const updateData = {};
        if (username) {
            if (username !== user.username) {
                const existingUser = await db_1.default.user.findFirst({
                    where: { username, deletedAt: null }
                });
                if (existingUser) {
                    throw new errorHandler_1.AppError("Username already taken", 409);
                }
                updateData.username = username;
            }
        }
        if (password) {
            updateData.passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({ success: true, data: updatedUser });
    }
    catch (error) {
        throw error;
    }
}
async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const user = await db_1.default.user.findUnique({ where: { id: parseInt(id) } });
        if (!user)
            throw new errorHandler_1.AppError("User not found", 404);
        // Prevent modifying super admins
        if (user.role === "SUPER_ADMIN") {
            throw new errorHandler_1.AppError("Cannot modify super admin role", 403);
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: parseInt(id) },
            data: { role },
            select: {
                id: true,
                username: true,
                role: true
            }
        });
        res.json({ success: true, data: updatedUser });
    }
    catch (error) {
        throw error;
    }
}
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const user = await db_1.default.user.findUnique({ where: { id: parseInt(id) } });
        if (!user)
            throw new errorHandler_1.AppError("User not found", 404);
        // Prevent deleting super admins
        if (user.role === "SUPER_ADMIN") {
            throw new errorHandler_1.AppError("Cannot delete super admin", 403);
        }
        // Soft delete
        await db_1.default.user.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ success: true, message: "User deleted successfully" });
    }
    catch (error) {
        throw error;
    }
}
async function checkUsernameAvailability(req, res) {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            throw new errorHandler_1.AppError("Username is required", 400);
        }
        const existingUser = await db_1.default.user.findFirst({
            where: { username, deletedAt: null }
        });
        res.json({ available: !existingUser });
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=userController.js.map