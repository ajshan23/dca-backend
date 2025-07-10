"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../samples/errorHandler");
function authenticateJWT(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next(new errorHandler_1.AppError("Authorization header is required", 401));
    }
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return next(new errorHandler_1.AppError("Invalid authorization header format", 401));
    }
    const token = tokenParts[1];
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new errorHandler_1.AppError("Invalid or expired token", 403));
        }
        // Type assertion to UserAttributes
        req.user = decoded;
        next();
    });
}
//# sourceMappingURL=authMiddleware.js.map