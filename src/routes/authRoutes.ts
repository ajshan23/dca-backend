import express from "express";
import { login, createUser, updateUser } from "../controllers/authController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import { UserRole } from "../constants/roles";


const router = express.Router();

router.post("/login",  login);

router.post(
  "/",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
 
  createUser
);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updateUser
);

export default router;