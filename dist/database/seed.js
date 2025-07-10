"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.updateSuperAdminRole = updateSuperAdminRole;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("./prisma"));
async function main() {
    const superadminEmail = 'superadmin';
    const superadminPassword = 'SuperAdmin@1234';
    const hashedPassword = await bcryptjs_1.default.hash(superadminPassword, 12);
    const existingSuperadmin = await prisma_1.default.user.findFirst({
        where: {
            OR: [
                { username: superadminEmail },
                { role: 'super_admin' }
            ]
        }
    });
    if (existingSuperadmin) {
        console.log('Superadmin already exists:', existingSuperadmin);
        return;
    }
    const superadmin = await prisma_1.default.user.create({
        data: {
            username: superadminEmail,
            passwordHash: hashedPassword,
            role: 'super_admin',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    console.log('Created superadmin:', {
        id: superadmin.id,
        username: superadmin.username,
        role: superadmin.role
    });
}
async function updateSuperAdminRole() {
    const result = await prisma_1.default.user.updateMany({
        where: {
            role: 'SUPER_ADMIN',
        },
        data: {
            role: 'super_admin',
        },
    });
    console.log(`${result.count} user(s) updated.`);
}
//# sourceMappingURL=seed.js.map