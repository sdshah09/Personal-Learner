

import { McpClient } from './mcpClient';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { URL } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';
import 'dotenv/config';

export { McpClient };

export async function createMcpClient(retries: number = 5, delay: number = 1000) {
    const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
        throw new Error("Claude API Key not present");
    }

    const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY
    });

    const mcp = new Client({ 
        name: "mcp-client", 
        version: "1.0.0" 
    });

    const transport = new StreamableHTTPClientTransport(
        new URL(MCP_SERVER_URL)
    );

    const client = new McpClient(mcp, anthropic, transport);
    
    // Retry connection with exponential backoff
    for (let i = 0; i < retries; i++) {
        try {
            await client.connectToServer();
            return client;
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            console.log(`MCP connection attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5; // Exponential backoff
        }
    }
    
    return client;
}

export async function startChatLoop() {
    const client = await createMcpClient();

    try {
        await client.chatLoop();
    } finally {
        await client.cleanup();
    }
}

