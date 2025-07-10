"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = exports.loginSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.loginSchema = joi_1.default.object({
    username: joi_1.default.string().required(),
    password: joi_1.default.string().required(),
});
exports.createUserSchema = joi_1.default.object({
    username: joi_1.default.string().min(3).max(50).required(),
    password: joi_1.default.string().min(8).required(),
    role: joi_1.default.string().valid("user", "admin"),
});
exports.updateUserSchema = joi_1.default.object({
    username: joi_1.default.string().min(3).max(50),
    password: joi_1.default.string().min(8),
});
//# sourceMappingURL=authValidations.js.map