// routes/dashboardRoutes.ts
import express from "express";
import { getProductDashboardData } from "../controllers/dashboardController";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/products", authenticateJWT, getProductDashboardData);

export default router;