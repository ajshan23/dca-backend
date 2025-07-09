import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  createCategory
);

router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  updateCategory
);

router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  deleteCategory
);

export default router;