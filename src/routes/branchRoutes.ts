import express from "express";
import {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch
} from "../controllers/branchController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { createBranchSchema, updateBranchSchema } from "../validations/branchValidations";


const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  createBranch
);

router.get("/", getAllBranches);
router.get("/:id", getBranchById);

router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  validateRequest(updateBranchSchema),
  updateBranch
);

router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  deleteBranch
);

export default router;