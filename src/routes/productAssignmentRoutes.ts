import express from "express";
import {
  assignProduct,
  returnProduct,
  getActiveAssignments,
  getAssignmentHistory,
  getEmployeeAssignments,
  updateAssignment,
  bulkAssignProducts,
  getProductAssignments,
} from "../controllers/productAssignmentController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";


const router = express.Router();

router.post(
  "/assign",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  assignProduct
);

router.post(
  "/bulk-assign",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  bulkAssignProducts
);
// Add this to your productAssignmentRoutes.ts
router.get(
  "/product/:productId", 
  authenticateJWT, 
  getProductAssignments
);
router.post(
  "/return/:assignmentId",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  returnProduct
);

router.get("/active", authenticateJWT, getActiveAssignments);
router.get("/history", authenticateJWT, getAssignmentHistory);
router.get("/employee/:employeeId", authenticateJWT, getEmployeeAssignments);
router.put("/:assignmentId", authenticateJWT, updateAssignment);

export default router;