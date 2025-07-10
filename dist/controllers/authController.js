"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.createUser = createUser;
exports.updateUser = updateUser;
const errorHandler_1 = require("../samples/errorHandler");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../database/db"));
const BCRYPT_SALT_ROUNDS = 12;
async function login(req, res) {
    try {
        const { username, password } = req.body;
        if (!username?.trim() || !password?.trim()) {
            throw new errorHandler_1.AppError("Username and password are required", 400);
        }
        const user = await db_1.default.user.findFirst({
            where: { username, deletedAt: null },
            select: {
                id: true,
                username: true,
                passwordHash: true,
                role: true
            }
        });
        if (!user) {
            throw new errorHandler_1.AppError("Invalid credentials", 401);
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            throw new errorHandler_1.AppError("Invalid credentials", 401);
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || "your-secret-your_secure_jwt_secret_32chars_min", { expiresIn: "1d" });
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            }
        });
    }
    catch (error) {
        throw error;
    }
}
async function createUser(req, res) {
    try {
        if (!req.user) {
            throw new errorHandler_1.AppError("Authentication required", 401);
        }
        const currentUser = req.user;
        const { username, password, role = "USER" } = req.body;
        // Validate input
        if (!username || !password) {
            throw new errorHandler_1.AppError("Username and password are required", 400);
        }
        if (password.length < 8) {
            throw new errorHandler_1.AppError("Password must be at least 8 characters", 400);
        }
        // Check permissions
        if (role === "ADMIN" && currentUser.role !== "SUPER_ADMIN") {
            throw new errorHandler_1.AppError("Only super admin can create admin", 403);
        }
        if (role === "SUPER_ADMIN") {
            throw new errorHandler_1.AppError("Cannot create super admin via API", 403);
        }
        const existingUser = await db_1.default.user.findFirst({
            where: { username, deletedAt: null }
        });
        if (existingUser) {
            throw new errorHandler_1.AppError("Username is already taken", 409);
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
        const user = await db_1.default.user.create({
            data: {
                username,
                passwordHash: hashedPassword,
                role
            },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        res.status(201).json({ success: true, data: user });
    }
    catch (error) {
        throw error;
    }
}
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;
        const user = await db_1.default.user.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!user) {
            throw new errorHandler_1.AppError("User not found", 404);
        }
        // Prevent editing super_admin unless current user is super_admin
        if (user.role === "SUPER_ADMIN" &&
            req.user?.role !== "SUPER_ADMIN") {
            throw new errorHandler_1.AppError("Cannot modify super admin", 403);
        }
        const updateData = {};
        if (username && username !== user.username) {
            const existingUser = await db_1.default.user.findFirst({
                where: { username, deletedAt: null }
            });
            if (existingUser) {
                throw new errorHandler_1.AppError("Username already taken", 409);
            }
            updateData.username = username;
        }
        if (password) {
            updateData.passwordHash = await bcryptjs_1.default.hash(password, BCRYPT_SALT_ROUNDS);
        }
        if (role && role !== user.role) {
            // Only super admin can change roles to admin
            if (role === "ADMIN" && req.user?.role !== "SUPER_ADMIN") {
                throw new errorHandler_1.AppError("Only super admin can assign admin role", 403);
            }
            updateData.role = role;
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true,
                updatedAt: true
            }
        });
        res.json({ success: true, data: updatedUser });
    }
    catch (error) {
        throw error;
    }
}
//# sourceMappingURL=authController.js.map