import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
  getCurrentUser,
  checkUsernameAvailability
} from "../controllers/userController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { updateUserSchema, updateRoleSchema } from "../validations/userValidations";

const router = express.Router();

// Get current user profile (for any authenticated user)
router.get("/me", authenticateJWT, getCurrentUser);

// Check username availability
router.get("/check-username", checkUsernameAvailability);

// Admin-only routes
router.get(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  getAllUsers
);

router.get(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  getUserById
);

// User can update their own profile
router.patch(
  "/:id",
  authenticateJWT,
  validateRequest(updateUserSchema),
  updateUser
);

// Only super admin can change roles
router.patch(
  "/:id/role",
  authenticateJWT,
  authorizeRoles("super_admin"),
  validateRequest(updateRoleSchema),
  updateUserRole
);

// Only super admin can delete users
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("super_admin"),
  deleteUser
);

export default router;