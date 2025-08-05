import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  generateProductQr,
  getAssignedProducts
} from "../controllers/productController";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import { UserRole } from "../constant/roles";

const router = express.Router();

router.post("/", authenticateJWT, authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN,UserRole.USER), createProduct);
router.get("/", getAllProducts);
router.get("/assigned", getAssignedProducts);
router.get("/:id", getProductById);
router.put("/:id", authenticateJWT, authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN,UserRole.USER), updateProduct);
router.delete("/:id", authenticateJWT, authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN,UserRole.USER), deleteProduct);
router.post("/:id/generate-qr", authenticateJWT, generateProductQr);

export default router;