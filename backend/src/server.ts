import 'dotenv/config';
import express from 'express';
import { signup, login } from './handlers/auth';
import { createDomain, listDomains } from './handlers/domains';
import { healthCheck } from './handlers/health';
import cors from "cors";
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mcpHandler } from './handlers/mcp';

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



// Helper routes
app.get('/api/health', healthCheck);

// MCP route

app.post("/mcp", mcpHandler)
// API Routes
// Auth routes
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// Domain routes
app.post('/api/domains', createDomain);
app.get('/api/domains', listDomains);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

