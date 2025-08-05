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
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
const client_1 = require("@prisma/client");
async function assignProduct(req, res) {
    const { productId, employeeId, expectedReturnAt, notes } = req.body;
    const assignedById = req.user?.userId;
    // Validate required fields
    if (!assignedById) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }
    if (!productId || !employeeId) {
        res.status(400).json({ success: false, message: "Product ID and Employee ID are required" });
        return;
    }
    try {
        // Use transaction to ensure data consistency
        const result = await db_1.default.$transaction(async (tx) => {
            // Check for existing active assignment
            const existingAssignment = await tx.productAssignment.findFirst({
                where: {
                    productId,
                    returnedAt: null
                }
            });
            if (existingAssignment) {
                // If assigning to same employee, update the existing assignment
                if (existingAssignment.employeeId === employeeId) {
                    return await tx.productAssignment.update({
                        where: { id: existingAssignment.id },
                        data: {
                            expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt) : null,
                            notes,
                            assignedById: parseInt(assignedById),
                            assignedAt: new Date() // Refresh assignment date
                        },
                        include: {
                            product: true,
                            employee: true,
                            assignedBy: true
                        }
                    });
                }
                // If assigning to different employee, first return the existing assignment
                await tx.productAssignment.update({
                    where: { id: existingAssignment.id },
                    data: {
                        status: "RETURNED",
                        returnedAt: new Date(),
                        notes: "Automatically returned for re-assignment"
                    }
                });
            }
            // Verify product exists and is not deleted
            const product = await tx.product.findFirst({
                where: { id: productId, deletedAt: null }
            });
            if (!product) {
                throw new errorHandler_1.AppError("Product not found or is deleted", 404);
            }
            // Verify employee exists and is not deleted
            const employee = await tx.employee.findFirst({
                where: { id: employeeId, deletedAt: null }
            });
            if (!employee) {
                throw new errorHandler_1.AppError("Employee not found or is deleted", 404);
            }
            // Validate expected return date if provided
            if (expectedReturnAt && new Date(expectedReturnAt) < new Date()) {
                throw new errorHandler_1.AppError("Expected return date cannot be in the past", 400);
            }
            // Create new assignment
            return await tx.productAssignment.create({
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
        });
        res.status(201).json({ success: true, data: result });
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
        if (error instanceof errorHandler_1.AppError) {
            res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to assign product",
            error: error instanceof Error ? error.message : undefined
        });
        return;
    }
}
async function returnProduct(req, res) {
    const { assignmentId } = req.params;
    const { condition, notes } = req.body;
    try {
        const assignment = await db_1.default.productAssignment.findUnique({
            where: { id: parseInt(assignmentId) },
            include: {
                product: true,
                employee: true
            }
        });
        if (!assignment) {
            res.status(404).json({ success: false, message: "Assignment not found" });
            return;
        }
        if (assignment.returnedAt) {
            res.status(400).json({ success: false, message: "Product already returned" });
            return;
        }
        const updatedAssignment = await db_1.default.productAssignment.update({
            where: { id: parseInt(assignmentId) },
            data: {
                status: "RETURNED",
                returnedAt: new Date(),
                condition: condition || null,
                notes: notes || `Returned by ${req.user?.username}`
            },
            include: {
                product: true,
                employee: true,
                assignedBy: true
            }
        });
        res.json({
            success: true,
            data: updatedAssignment,
            message: "Product returned successfully"
        });
        return;
    }
    catch (error) {
        console.error('Return error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to return product",
            error: error instanceof Error ? error.message : undefined
        });
        return;
    }
}
async function getActiveAssignments(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const [assignments, total] = await db_1.default.$transaction([
            db_1.default.productAssignment.findMany({
                where: {
                    returnedAt: null,
                    status: 'ASSIGNED'
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            model: true,
                            category: true,
                            branch: true
                        }
                    },
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            empId: true
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    assignedAt: 'desc'
                },
                skip: (pageNumber - 1) * limitNumber,
                take: limitNumber
            }),
            db_1.default.productAssignment.count({
                where: {
                    returnedAt: null,
                    status: 'ASSIGNED'
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
    }
    catch (error) {
        console.error('Error fetching active assignments:', error);
        throw new errorHandler_1.AppError("Failed to fetch active assignments", 500);
    }
}
async function getAssignmentHistory(req, res) {
    try {
        const { page = 1, limit = 10, fromDate, toDate } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const where = {
            NOT: { returnedAt: null }
        };
        if (fromDate || toDate) {
            where.assignedAt = {};
            if (fromDate)
                where.assignedAt.gte = new Date(fromDate);
            if (toDate)
                where.assignedAt.lte = new Date(toDate);
        }
        const [assignments, total] = await db_1.default.$transaction([
            db_1.default.productAssignment.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            model: true,
                            category: true,
                            branch: true
                        }
                    },
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            empId: true
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    assignedAt: 'desc'
                },
                skip: (pageNumber - 1) * limitNumber,
                take: limitNumber
            }),
            db_1.default.productAssignment.count({ where })
        ]);
        res.json({
            success: true,
            data: assignments.map(assignment => ({
                ...assignment,
                status: assignment.returnedAt ? 'RETURNED' : assignment.status
            })),
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber)
            }
        });
    }
    catch (error) {
        console.error('Error fetching assignment history:', error);
        throw new errorHandler_1.AppError("Failed to fetch assignment history", 500);
    }
}
async function getEmployeeAssignments(req, res) {
    try {
        const { employeeId } = req.params;
        const assignments = await db_1.default.productAssignment.findMany({
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
        const assignment = await db_1.default.productAssignment.findUnique({
            where: { id: parseInt(assignmentId) }
        });
        if (!assignment)
            throw new errorHandler_1.AppError("Assignment not found", 404);
        if (assignment.status === "RETURNED") {
            throw new errorHandler_1.AppError("Cannot modify returned assignments", 400);
        }
        const updatedAssignment = await db_1.default.productAssignment.update({
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
        // Process assignments in a transaction
        const results = await db_1.default.$transaction(assignments.map(({ productId, employeeId, expectedReturnAt, notes }) => {
            return db_1.default.productAssignment.create({
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
        const assignments = await db_1.default.productAssignment.findMany({
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