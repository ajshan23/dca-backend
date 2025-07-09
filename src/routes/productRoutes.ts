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
import { authorizeRoles } from "@/middlewares/roleMiddleware";
import { authenticateJWT } from "@/middlewares/authMiddleware";

const router = express.Router();

router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  createProduct
);
router.get("/", getAllProducts);
router.get("/assigned", getAssignedProducts);
router.get("/:id", getProductById);
router.put(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  updateProduct
);

router.delete(
  "/:id",
  authenticateJWT,
  authorizeRoles("admin", "super_admin"),
  deleteProduct
);
router.post(
  '/:id/generate-qr',
  authenticateJWT,
  generateProductQr
);

export default router;