"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductDashboardData = getProductDashboardData;
const errorHandler_1 = require("../samples/errorHandler");
const db_1 = __importDefault(require("../database/db"));
const date_fns_1 = require("date-fns");
async function getProductDashboardData(_req, res) {
    try {
        // Get counts for products
        const [totalProducts, assignedProducts, availableProducts] = await Promise.all([
            db_1.default.product.count({ where: { deletedAt: null } }),
            db_1.default.productAssignment.count({
                where: {
                    status: "ASSIGNED",
                    returnedAt: null,
                    product: { deletedAt: null }
                }
            }),
            db_1.default.product.count({
                where: {
                    deletedAt: null,
                    assignments: {
                        none: {
                            status: "ASSIGNED",
                            returnedAt: null
                        }
                    }
                }
            })
        ]);
        // Get weekly trend data
        const now = new Date();
        const weekStart = (0, date_fns_1.startOfWeek)(now);
        const weekEnd = (0, date_fns_1.endOfWeek)(now);
        const daysOfWeek = (0, date_fns_1.eachDayOfInterval)({ start: weekStart, end: weekEnd });
        const weeklyTrendData = await Promise.all(daysOfWeek.map(async (day) => {
            const dayStart = new Date(day);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);
            const [assignedCount, availableCount] = await Promise.all([
                db_1.default.productAssignment.count({
                    where: {
                        assignedAt: { gte: dayStart, lte: dayEnd },
                        status: "ASSIGNED",
                        product: { deletedAt: null }
                    }
                }),
                db_1.default.product.count({
                    where: {
                        deletedAt: null,
                        assignments: {
                            none: {
                                status: "ASSIGNED",
                                returnedAt: null
                            }
                        },
                        createdAt: { lte: dayEnd }
                    }
                })
            ]);
            return {
                day: (0, date_fns_1.format)(day, 'EEE'),
                assigned: assignedCount,
                available: availableCount
            };
        }));
        // Get recent assignments
        const recentAssignments = await db_1.default.productAssignment.findMany({
            take: 5,
            where: {
                status: "ASSIGNED",
                returnedAt: null,
                product: { deletedAt: null }
            },
            orderBy: {
                assignedAt: 'desc'
            },
            include: {
                product: true,
                employee: true
            }
        });
        // Get category stats
        const categoryStats = await db_1.default.category.findMany({
            where: { deletedAt: null },
            include: {
                _count: {
                    select: {
                        products: {
                            where: { deletedAt: null }
                        }
                    }
                },
                products: {
                    where: { deletedAt: null },
                    include: {
                        assignments: {
                            where: {
                                status: "ASSIGNED",
                                returnedAt: null
                            }
                        }
                    }
                }
            }
        });
        // Format category stats
        const formattedCategoryStats = categoryStats.map(category => {
            const assignedCount = category.products.reduce((sum, product) => {
                return sum + product.assignments.length;
            }, 0);
            return {
                name: category.name,
                total: category._count.products,
                assigned: assignedCount,
                available: category._count.products - assignedCount
            };
        });
        // Format the response
        const dashboardData = {
            productCount: totalProducts,
            productOverview: {
                assigned: assignedProducts,
                available: availableProducts,
                total: totalProducts,
                weeklyTrend: {
                    series: [
                        {
                            name: 'Assigned',
                            data: weeklyTrendData.map(day => day.assigned)
                        },
                        {
                            name: 'Available',
                            data: weeklyTrendData.map(day => day.available)
                        }
                    ],
                    categories: weeklyTrendData.map(day => day.day)
                }
            },
            recentAssignments: recentAssignments.map(assignment => ({
                id: `PROD-${assignment.productId.toString().padStart(3, '0')}`,
                name: assignment.product.name,
                assignedTo: assignment.employee.name,
                date: assignment.assignedAt.toISOString().split('T')[0],
                status: assignment.status.toLowerCase()
            })),
            categoryStats: formattedCategoryStats
        };
        res.json({ success: true, data: dashboardData });
    }
    catch (error) {
        throw new errorHandler_1.AppError("Failed to fetch dashboard data", 500);
    }
}
//# sourceMappingURL=dashboardController.js.map