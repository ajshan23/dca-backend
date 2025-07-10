"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProductQr = void 0;
exports.createProduct = createProduct;
exports.getAllProducts = getAllProducts;
exports.getAssignedProducts = getAssignedProducts;
exports.getProductById = getProductById;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
const client_1 = require("@prisma/client");
const qrcode_1 = __importDefault(require("qrcode"));
async function createProduct(req, res) {
    try {
        const { name, model, categoryId, branchId, departmentId, warrantyDate, complianceStatus, notes } = req.body;
        // Validate required fields
        if (!name || !model || !categoryId || !branchId) {
            throw new errorHandler_1.AppError("Missing required fields", 400);
        }
        // Check if category exists
        const categoryExists = await db_1.default.category.findFirst({
            where: { id: categoryId, deletedAt: null }
        });
        if (!categoryExists) {
            throw new errorHandler_1.AppError("Category not found", 404);
        }
        // Check if branch exists
        const branchExists = await db_1.default.branch.findFirst({
            where: { id: branchId, deletedAt: null }
        });
        if (!branchExists) {
            throw new errorHandler_1.AppError("Branch not found", 404);
        }
        // Check if department exists if provided
        if (departmentId) {
            const departmentExists = await db_1.default.department.findFirst({
                where: { id: departmentId, deletedAt: null }
            });
            if (!departmentExists) {
                throw new errorHandler_1.AppError("Department not found", 404);
            }
        }
        const product = await db_1.default.product.create({
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                let field = 'field';
                if (Array.isArray(error.meta?.target)) {
                    field = error.meta.target[0];
                }
                else if (typeof error.meta?.target === 'string') {
                    field = error.meta.target;
                }
                throw new errorHandler_1.AppError(`A product with this ${field} already exists`, 400);
            }
            if (error.code === 'P2003') {
                throw new errorHandler_1.AppError("Invalid reference ID provided", 400);
            }
        }
        throw error;
    }
}
async function getAllProducts(req, res) {
    try {
        const { page = 1, limit = 10, search = '', includeAssignments, categoryId, branchId, departmentId, complianceStatus } = req.query;
        const where = {
            OR: [
                { name: { contains: search } },
                { model: { contains: search } }
            ],
            deletedAt: null
        };
        // Add optional filters
        if (categoryId) {
            where.categoryId = parseInt(categoryId);
        }
        if (branchId) {
            where.branchId = parseInt(branchId);
        }
        if (departmentId) {
            where.departmentId = parseInt(departmentId);
        }
        if (complianceStatus) {
            where.complianceStatus = complianceStatus === 'true';
        }
        const [products, total] = await db_1.default.$transaction([
            db_1.default.product.findMany({
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
            db_1.default.product.count({ where })
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
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch products", 500);
    }
}
async function getAssignedProducts(req, res) {
    try {
        const { page = 1, limit = 10, search = '', categoryId, branchId, departmentId } = req.query;
        const where = {
            AND: [
                {
                    OR: [
                        { name: { contains: search } },
                        { model: { contains: search } }
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
            where.categoryId = parseInt(categoryId);
        }
        if (branchId) {
            where.branchId = parseInt(branchId);
        }
        if (departmentId) {
            where.departmentId = parseInt(departmentId);
        }
        const [products, total] = await db_1.default.$transaction([
            db_1.default.product.findMany({
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
            db_1.default.product.count({ where })
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
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch assigned products", 500);
    }
}
async function getProductById(req, res) {
    try {
        const product = await db_1.default.product.findUnique({
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
        if (!product)
            throw new errorHandler_1.AppError("Product not found", 404);
        res.json({ success: true, data: product });
    }
    catch (error) {
        throw error;
    }
}
async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const { departmentId, ...updateData } = req.body;
        // Check if product exists
        const existingProduct = await db_1.default.product.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!existingProduct) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        // Validate department if provided
        if (departmentId) {
            const departmentExists = await db_1.default.department.findFirst({
                where: { id: departmentId, deletedAt: null }
            });
            if (!departmentExists) {
                throw new errorHandler_1.AppError("Department not found", 404);
            }
        }
        const product = await db_1.default.product.update({
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                let field = 'field';
                if (Array.isArray(error.meta?.target)) {
                    field = error.meta.target[0];
                }
                else if (typeof error.meta?.target === 'string') {
                    field = error.meta.target;
                }
                throw new errorHandler_1.AppError(`A product with this ${field} already exists`, 400);
            }
            if (error.code === 'P2003') {
                throw new errorHandler_1.AppError("Invalid reference ID provided", 400);
            }
        }
        throw error;
    }
}
async function deleteProduct(req, res) {
    try {
        const { id } = req.params;
        // Check if product exists
        const productExists = await db_1.default.product.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!productExists) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        const assignments = await db_1.default.productAssignment.count({
            where: { productId: parseInt(id) }
        });
        if (assignments > 0) {
            throw new errorHandler_1.AppError("Cannot delete product with active assignments", 400);
        }
        // Soft delete
        await db_1.default.product.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date() }
        });
        res.json({ success: true, message: "Product deleted successfully" });
    }
    catch (error) {
        throw error;
    }
}
const generateProductQr = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new errorHandler_1.AppError('Product ID is required', 400);
        }
        // Check if product exists
        const productExists = await db_1.default.product.findFirst({
            where: { id: parseInt(id), deletedAt: null }
        });
        if (!productExists) {
            throw new errorHandler_1.AppError("Product not found", 404);
        }
        const productUrl = `${process.env.FRONTEND_URL}/products/view/${id}`;
        const qrCodeData = await qrcode_1.default.toDataURL(productUrl, {
            errorCorrectionLevel: 'H',
            width: 300,
            margin: 1
        });
        res.status(200).json({
            success: true,
            qrCodeData,
            productUrl
        });
    }
    catch (error) {
        console.error('QR Generation Error:', error);
        throw new errorHandler_1.AppError('Failed to generate QR code', 500);
    }
};
exports.generateProductQr = generateProductQr;
//# sourceMappingURL=productController.js.map