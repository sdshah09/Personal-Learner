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
const mcp_1 = require("./handlers/mcp");
const index_1 = require("./mcpClient/index");
const sdk_1 = require("@anthropic-ai/sdk");
const chatService_1 = require("./services/chatService");
const weeklyAgent_1 = require("./services/weeklyAgent");
const chat_1 = require("./handlers/chat");
const db_1 = __importDefault(require("./utils/db"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: true,
    methods: "*",
    allowedHeaders: "Authorization, Origin, Content-Type, Accept, *",
}));
app.options("*", (0, cors_1.default)());
// Initialize services
let chatService = null;
let weeklyAgent = null;
async function initializeServices() {
    try {
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not set");
        }
        const anthropic = new sdk_1.Anthropic({
            apiKey: ANTHROPIC_API_KEY
        });
        // Create and connect MCP client
        const mcpClient = await (0, index_1.createMcpClient)();
        // Initialize services
        chatService = new chatService_1.ChatService(mcpClient, anthropic);
        weeklyAgent = new weeklyAgent_1.WeeklyAgent(db_1.default, anthropic, mcpClient);
        // Start weekly agent loop
        weeklyAgent.startWeeklyAgentLoop();
        console.log('Services initialized successfully');
    }
    catch (error) {
        console.error('Error initializing services:', error);
        process.exit(1);
    }
}
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
// Chat route
app.post('/api/chat', (req, res) => {
    if (!chatService) {
        return res.status(503).json({
            error: 'Chat service not initialized',
            success: false
        });
    }
    const handler = (0, chat_1.createChatHandler)(chatService);
    return handler(req, res);
});
const PORT = process.env.PORT || 3000;
// Start server first, then initialize services
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Wait a moment for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 500));
    // Now initialize services (MCP client will connect to this server)
    try {
        await initializeServices();
    }
    catch (error) {
        console.error('Failed to initialize services:', error);
        // Don't exit - server is running, services can retry later
    }
});
