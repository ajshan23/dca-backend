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
import { UserRole } from "../constants/roles";

const router = express.Router();

// Get current user profile (for any authenticated user)
router.get("/me", authenticateJWT, getCurrentUser);

// Check username availability
router.get("/check-username", checkUsernameAvailability);

// Admin-only routes
router.get(
  "/",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  getAllUsers
);

router.get(
  "/:id",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  getUserById
);

// User can update their own profile
router.patch(
  "/:id",
  authenticateJWT,
  updateUser
);

// Only super admin can change roles
router.patch(
  "/:id/role",
  authenticateJWT,
  authorizeRoles(UserRole.SUPER_ADMIN),
  updateUserRole
);

// Only super admin can delete users
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles( UserRole.SUPER_ADMIN),
  deleteUser
);

export default router;