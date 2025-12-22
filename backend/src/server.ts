import 'dotenv/config';
import express from 'express';
import { signup, login } from './handlers/auth';
import { createDomain, listDomains } from './handlers/domains';
import { healthCheck } from './handlers/health';
import cors from "cors";
import { mcpHandler } from './handlers/mcp';
import { createMcpClient } from './mcpClient/index';
import { Anthropic } from '@anthropic-ai/sdk';
import { ChatService } from './services/chatService';
import { WeeklyAgent } from './services/weeklyAgent';
import { createChatHandler } from './handlers/chat';
import prisma from './utils/db';

const app = express();
app.use(express.json());
app.use(
    cors({
        origin: true,
        methods: "*",
        allowedHeaders: "Authorization, Origin, Content-Type, Accept, *",
    })
);
app.options("*", cors());

// Initialize services
let chatService: ChatService | null = null;
let weeklyAgent: WeeklyAgent | null = null;

async function initializeServices() {
    try {
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not set");
        }

        const anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY
        });

        // Create and connect MCP client
        const mcpClient = await createMcpClient();
        
        // Initialize services
        chatService = new ChatService(mcpClient, anthropic);
        weeklyAgent = new WeeklyAgent(prisma, anthropic, mcpClient);
        
        // Start weekly agent loop
        weeklyAgent.startWeeklyAgentLoop();
        
        console.log('Services initialized successfully');
    } catch (error) {
        console.error('Error initializing services:', error);
        process.exit(1);
    }
}

// Helper routes
app.get('/api/health', healthCheck);

// MCP route
app.post("/mcp", mcpHandler);

// API Routes
// Auth routes
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// Domain routes
app.post('/api/domains', createDomain);
app.get('/api/domains', listDomains);

// Chat route
app.post('/api/chat', (req, res) => {
    if (!chatService) {
        return res.status(503).json({
            error: 'Chat service not initialized',
            success: false
        });
    }
    const handler = createChatHandler(chatService);
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
    } catch (error) {
        console.error('Failed to initialize services:', error);
        // Don't exit - server is running, services can retry later
    }
});

