import { Request, Response } from "express";
import { AppError } from "../samples/errorHandler";
import prisma from "../database/db";
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";

export async function getProductDashboardData( _req: Request, res: Response) {
  try {
    // Get counts for products
    const [totalProducts, assignedProducts, availableProducts] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.productAssignment.count({ 
        where: { 
          status: "ASSIGNED",
          returnedAt: null,
          product: { deletedAt: null }
        } 
      }),
      prisma.product.count({ 
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
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyTrendData = await Promise.all(
      daysOfWeek.map(async (day) => {
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const [assignedCount, availableCount] = await Promise.all([
          prisma.productAssignment.count({
            where: {
              assignedAt: { gte: dayStart, lte: dayEnd },
              status: "ASSIGNED",
              product: { deletedAt: null }
            }
          }),
          prisma.product.count({
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
          day: format(day, 'EEE'),
          assigned: assignedCount,
          available: availableCount
        };
      })
    );

    // Get recent assignments
    const recentAssignments = await prisma.productAssignment.findMany({
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
    const categoryStats = await prisma.category.findMany({
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
  } catch (error) {
    throw new AppError("Failed to fetch dashboard data", 500);
  }
}