"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("./config"));
const prisma_1 = __importDefault(require("./database/prisma"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./utils/errorHandler");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: config_1.default.cors.origin, credentials: true }));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
async function checkDatabaseConnection() {
    try {
        await prisma_1.default.$connect();
        console.log("✅ Database connected successfully");
    }
    catch (error) {
        console.error("❌ Database connection error:", error);
        process.exit(1);
    }
}
app.use("/api", routes_1.default);
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        await checkDatabaseConnection();
        const server = app.listen(config_1.default.port, () => {
            console.log(`🚀 Server running on port ${config_1.default.port} in ${config_1.default.env} mode`);
        });
        process.on("SIGTERM", () => {
            console.log("SIGTERM received. Shutting down gracefully...");
            server.close(async () => {
                await prisma_1.default.$disconnect();
                console.log("Server closed");
                process.exit(0);
            });
        });
        process.on("SIGINT", () => {
            console.log("SIGINT received. Shutting down gracefully...");
            server.close(async () => {
                await prisma_1.default.$disconnect();
                console.log("Server closed");
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error("❌ Server startup error:", error);
        await prisma_1.default.$disconnect();
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map