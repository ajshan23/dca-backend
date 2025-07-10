import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  generateProductQr,
  getAssignedProducts,

} from "../controllers/productController";
import { authorizeRoles } from "../middlewares/roleMiddleware";
import { authenticateJWT } from "../middlewares/authMiddleware";
import { UserRole } from "../constants/roles";

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  createProduct
);
router.get("/", getAllProducts);
router.get("/assigned", getAssignedProducts);
router.get("/:id", getProductById);
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  updateProduct
);

router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  deleteProduct
);
router.post(
  '/:id/generate-qr',
  authenticateJWT,
  generateProductQr
);

export default router;