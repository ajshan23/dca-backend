import express from "express";
import { login, createUser, updateUser } from "../controllers/authController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { loginSchema, createUserSchema, updateUserSchema } from "../validations/authValidations";


const router = express.Router();

router.post("/login",  login);

router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  validateRequest(createUserSchema),
  createUser
);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  validateRequest(updateUserSchema),
  updateUser
);

export default router;