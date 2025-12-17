"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const auth_1 = require("./handlers/auth");
const domains_1 = require("./handlers/domains");
const health_1 = require("./handlers/health");
const cors_1 = __importDefault(require("cors"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const mcp_1 = require("./handlers/mcp");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: true,
    methods: "*",
    allowedHeaders: "Authorization, Origin, Content-Type, Accept, *",
}));
app.options("*", (0, cors_1.default)());
// Helper routes
app.get('/api/health', health_1.healthCheck);
// MCP route
app.post("/mcp", mcp_1.mcpHandler);
// API Routes
// Auth routes
app.post('/api/auth/signup', auth_1.signup);
app.post('/api/auth/login', auth_1.login);
// Domain routes
app.post('/api/domains', domains_1.createDomain);
app.get('/api/domains', domains_1.listDomains);
const PORT = process.env.PORT || 3000;
const server = new mcp_js_1.McpServer({
    name: "Personal-Learner",
    version: "1.0.0"
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
