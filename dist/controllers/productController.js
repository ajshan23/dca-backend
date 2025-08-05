"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = createProduct;
exports.getAllProducts = getAllProducts;
exports.getProductById = getProductById;
exports.getAssignedProducts = getAssignedProducts;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.generateProductQr = generateProductQr;
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
const qrcode_1 = __importDefault(require("qrcode"));
async function createProduct(req, res) {
    try {
        const { name, model, categoryId, branchId, departmentId, warrantyDate, complianceStatus, notes } = req.body;
        if (!name || !model || !categoryId || !branchId) {
            throw new errorHandler_1.AppError("Name, model, category and branch are required", 400);
        }
        // Validate references
        const [category, branch] = await Promise.all([
            db_1.default.category.findFirst({ where: { id: categoryId, deletedAt: null } }),
            db_1.default.branch.findFirst({ where: { id: branchId, deletedAt: null } })
        ]);
        if (!category)
            throw new errorHandler_1.AppError("Category not found", 404);
        if (!branch)
            throw new errorHandler_1.AppError("Branch not found", 404);
        if (departmentId) {
            const department = await db_1.default.department.findFirst({
                where: { id: departmentId, deletedAt: null }
            });
            if (!department)
                throw new errorHandler_1.AppError("Department not found", 404);
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
    }
    catch (error) {
        throw error;
    }
}
async function getAllProducts(req, res) {
    try {
        const { page = 1, limit = 10, search, categoryId, branchId, departmentId, complianceStatus } = req.query;
        const where = { deletedAt: null };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { model: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (categoryId)
            where.categoryId = parseInt(categoryId);
        if (branchId)
            where.branchId = parseInt(branchId);
        if (departmentId)
            where.departmentId = parseInt(departmentId);
        if (complianceStatus)
            where.complianceStatus = complianceStatus === 'true';
        const [products, total] = await Promise.all([
            db_1.default.product.findMany({
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
            db_1.default.product.count({ where })
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
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch products", 500);
    }
}
async function getProductById(req, res) {
    try {
        const product = await db_1.default.product.findUnique({
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
                        condition: true,
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
        if (!product)
            throw new errorHandler_1.AppError("Product not found", 404);
        res.json({ success: true, data: product });
    }
    catch (error) {
        throw error;
    }
}
async function getAssignedProducts(_req, res) {
    try {
        const products = await db_1.default.product.findMany({
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
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch assigned products", 500);
    }
}
async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const { name, model, categoryId, branchId, departmentId, warrantyDate, complianceStatus, notes } = req.body;
        const product = await db_1.default.product.findUnique({
            where: { id: parseInt(id) }
        });
        if (!product)
            throw new errorHandler_1.AppError("Product not found", 404);
        // Validate references if changed
        if (categoryId && categoryId !== product.categoryId) {
            const category = await db_1.default.category.findFirst({
                where: { id: categoryId, deletedAt: null }
            });
            if (!category)
                throw new errorHandler_1.AppError("Category not found", 404);
        }
        if (branchId && branchId !== product.branchId) {
            const branch = await db_1.default.branch.findFirst({
                where: { id: branchId, deletedAt: null }
            });
            if (!branch)
                throw new errorHandler_1.AppError("Branch not found", 404);
        }
        if (departmentId && departmentId !== product.departmentId) {
            const department = await db_1.default.department.findFirst({
                where: { id: departmentId, deletedAt: null }
            });
            if (!department)
                throw new errorHandler_1.AppError("Department not found", 404);
        }
        const updatedProduct = await db_1.default.product.update({
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
    }
    catch (error) {
        throw error;
    }
}
async function deleteProduct(req, res) {
    try {
        const { id } = req.params;
        const product = await db_1.default.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                    select: {
                        assignments: true
                    }
                }
            }
        });
        if (!product)
            throw new errorHandler_1.AppError("Product not found", 404);
        if (product._count.assignments > 0) {
            throw new errorHandler_1.AppError("Cannot delete product with active assignments", 400);
        }
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
async function generateProductQr(req, res) {
    try {
        const { id } = req.params;
        const product = await db_1.default.product.findUnique({
            where: { id: parseInt(id) }
        });
        if (!product)
            throw new errorHandler_1.AppError("Product not found", 404);
        const productUrl = `${process.env.FRONTEND_URL}/products/${id}`;
        const qrCode = await qrcode_1.default.toDataURL(productUrl);
        res.json({
            success: true,
            data: {
                qrCode,
                productUrl
            }
        });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to generate QR code", 500);
    }
}
//# sourceMappingURL=productController.js.map