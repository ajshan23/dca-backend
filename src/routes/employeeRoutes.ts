import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee
} from "../controllers/employeeController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  createEmployee
);

router.get("/", authenticateJWT, getAllEmployees);
router.get("/:id", authenticateJWT, getEmployeeById);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  updateEmployee
);

router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  deleteEmployee
);

export default router;