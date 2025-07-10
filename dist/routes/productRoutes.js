"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roles_1 = require("../constant/roles");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.authenticateJWT, (0, roleMiddleware_1.authorizeRoles)(roles_1.UserRole.ADMIN, roles_1.UserRole.SUPER_ADMIN), productController_1.createProduct);
router.get("/", productController_1.getAllProducts);
router.get("/assigned", productController_1.getAssignedProducts);
router.get("/:id", productController_1.getProductById);
router.put("/:id", authMiddleware_1.authenticateJWT, (0, roleMiddleware_1.authorizeRoles)(roles_1.UserRole.ADMIN, roles_1.UserRole.SUPER_ADMIN), productController_1.updateProduct);
router.delete("/:id", authMiddleware_1.authenticateJWT, (0, roleMiddleware_1.authorizeRoles)(roles_1.UserRole.ADMIN, roles_1.UserRole.SUPER_ADMIN), productController_1.deleteProduct);
router.post('/:id/generate-qr', authMiddleware_1.authenticateJWT, productController_1.generateProductQr);
exports.default = router;
//# sourceMappingURL=productRoutes.js.map