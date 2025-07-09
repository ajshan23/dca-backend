import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/departmentController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  createDepartment
);

router.get("/", getAllDepartments);
router.get("/:id", getDepartmentById);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  updateDepartment
);

router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  deleteDepartment
);

export default router;