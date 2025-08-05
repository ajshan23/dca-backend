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
import { UserRole } from "../constant/roles";


const router = express.Router();

router.post(
  "/assign",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN,UserRole.USER),
  assignProduct
);

router.post(
  "/bulk-assign",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN,UserRole.USER),
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
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN,UserRole.USER),
  returnProduct
);

router.get("/active", authenticateJWT, getActiveAssignments);
router.get("/history", authenticateJWT, getAssignmentHistory);
router.get("/employee/:employeeId", authenticateJWT, getEmployeeAssignments);
router.put("/:assignmentId", authenticateJWT, updateAssignment);

export default router;