"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignProduct = assignProduct;
exports.returnProduct = returnProduct;
exports.getActiveAssignments = getActiveAssignments;
exports.getAssignmentHistory = getAssignmentHistory;
exports.getEmployeeAssignments = getEmployeeAssignments;
exports.updateAssignment = updateAssignment;
exports.bulkAssignProducts = bulkAssignProducts;
exports.getProductAssignments = getProductAssignments;
const errorHandler_1 = require("../utils/errorHandler");
const prisma_1 = __importDefault(require("@/database/prisma"));
const client_1 = require("@prisma/client");
async function assignProduct(req, res) {
    const { productId, employeeId, expectedReturnAt, notes } = req.body;
    console.log(req.user);
    const assignedById = req.user?.userId;
    if (!assignedById) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }
    if (!productId || !employeeId) {
        res.status(400).json({ success: false, message: "Product ID and Employee ID are required" });
        return;
    }
    try {
        const product = await prisma_1.default.product.findFirst({
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
            res.status(404).json({ success: false, message: "Product not found or is deleted" });
            return;
        }
        if (product.assignments.length > 0) {
            res.status(400).json({ success: false, message: "Product is already assigned to someone" });
            return;
        }
        const employee = await prisma_1.default.employee.findFirst({
            where: { id: employeeId }
        });
        if (!employee) {
            res.status(404).json({ success: false, message: "Employee not found or is deleted" });
            return;
        }
        if (expectedReturnAt && new Date(expectedReturnAt) < new Date()) {
            res.status(400).json({
                success: false,
                message: "Expected return date cannot be in the past"
            });
        }
        const assignment = await prisma_1.default.productAssignment.create({
            data: {
                productId,
                employeeId,
                assignedById: parseInt(assignedById),
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
        res.status(201).json({ success: true, data: assignment });
        return;
    }
    catch (error) {
        console.error('Assignment error:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                res.status(400).json({
                    success: false,
                    message: "Assignment conflict - this combination already exists"
                });
                return;
            }
            if (error.code === 'P2003') {
                res.status(400).json({
                    success: false,
                    message: "Invalid ID provided - product or employee doesn't exist"
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            message: "Failed to assign product",
            error: undefined
        });
        return;
    }
}
async function returnProduct(req, res) {
    try {
        const { assignmentId } = req.params;
        const { condition, notes } = req.body;
        const assignment = await prisma_1.default.productAssignment.findUnique({
            where: { id: parseInt(assignmentId) }
        });
        if (!assignment)
            throw new errorHandler_1.AppError("Assignment not found", 404);
        if (assignment.status === "RETURNED") {
            throw new errorHandler_1.AppError("Product already returned", 400);
        }
        const updatedAssignment = await prisma_1.default.productAssignment.update({
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
    }
    catch (error) {
        throw error;
    }
}
async function getActiveAssignments(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        if (isNaN(pageNumber)) {
            res.status(400).json({
                success: false,
                message: "Invalid page number"
            });
            return;
        }
        if (isNaN(limitNumber)) {
            res.status(400).json({
                success: false,
                message: "Invalid limit value"
            });
            return;
        }
        const [assignments, total] = await prisma_1.default.$transaction([
            prisma_1.default.productAssignment.findMany({
                where: {
                    status: "ASSIGNED",
                    returnedAt: null
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
            prisma_1.default.productAssignment.count({
                where: {
                    status: "ASSIGNED",
                    returnedAt: null
                }
            })
        ]);
        res.json({
            success: true,
            data: assignments,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber)
            }
        });
        return;
    }
    catch (error) {
        console.error('Error fetching active assignments:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                success: false,
                message: "Database error occurred"
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to fetch active assignments",
            error: undefined
        });
        return;
    }
}
async function getAssignmentHistory(_req, res) {
    try {
        const assignments = await prisma_1.default.productAssignment.findMany({
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
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch assignment history", 500);
    }
}
async function getEmployeeAssignments(req, res) {
    try {
        const { employeeId } = req.params;
        const assignments = await prisma_1.default.productAssignment.findMany({
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
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch employee assignments", 500);
    }
}
async function updateAssignment(req, res) {
    try {
        const { assignmentId } = req.params;
        const { expectedReturnAt, notes } = req.body;
        const assignment = await prisma_1.default.productAssignment.findUnique({
            where: { id: parseInt(assignmentId) }
        });
        if (!assignment)
            throw new errorHandler_1.AppError("Assignment not found", 404);
        if (assignment.status === "RETURNED") {
            throw new errorHandler_1.AppError("Cannot modify returned assignments", 400);
        }
        const updatedAssignment = await prisma_1.default.productAssignment.update({
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
    }
    catch (error) {
        throw error;
    }
}
async function bulkAssignProducts(req, res) {
    try {
        const { assignments } = req.body;
        const assignedById = req.user?.userId;
        if (!Array.isArray(assignments)) {
            throw new errorHandler_1.AppError("Assignments must be an array", 400);
        }
        if (!assignedById) {
            throw new errorHandler_1.AppError("Authentication required", 401);
        }
        const results = await prisma_1.default.$transaction(assignments.map(({ productId, employeeId, expectedReturnAt, notes }) => {
            return prisma_1.default.productAssignment.create({
                data: {
                    productId,
                    employeeId,
                    assignedById: parseInt(assignedById),
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
        }));
        res.status(201).json({ success: true, data: results });
    }
    catch (error) {
        throw error;
    }
}
async function getProductAssignments(req, res) {
    const { productId } = req.params;
    if (!productId) {
        res.status(400).json({
            success: false,
            message: "Product ID is required"
        });
        return;
    }
    try {
        const assignments = await prisma_1.default.productAssignment.findMany({
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
            res.status(404).json({
                success: false,
                message: "No assignments found for this product"
            });
            return;
        }
        res.json({
            success: true,
            data: assignments
        });
        return;
    }
    catch (error) {
        console.error('Error fetching product assignments:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID format"
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to fetch product assignments",
            error: undefined
        });
        return;
    }
}
//# sourceMappingURL=productAssignmentController.js.map