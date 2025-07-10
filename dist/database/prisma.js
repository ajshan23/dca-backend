"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const config_1 = __importDefault(require("../config"));
const prisma = new client_1.PrismaClient({
    log: config_1.default.db.logging ? ["query", "info", "warn", "error"] : ["warn", "error"],
    datasources: {
        db: {
            url: config_1.default.db.url
        }
    }
});
prisma.$use(async (params, next) => {
    if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
    }
    if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (params.args.data !== undefined) {
            params.args.data.deletedAt = new Date();
        }
        else {
            params.args.data = { deletedAt: new Date() };
        }
    }
    if (params.action === 'findUnique' || params.action === 'findFirst') {
        params.args.where.deletedAt = null;
    }
    if (params.action === 'findMany') {
        if (params.args.where) {
            if (params.args.where.deletedAt === undefined) {
                params.args.where.deletedAt = null;
            }
        }
        else {
            params.args.where = { deletedAt: null };
        }
    }
    return next(params);
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map