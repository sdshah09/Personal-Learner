/**
 * Chat Script
 * 
 * Run this script to start an interactive chat session with Claude using MCP tools
 * 
 * Usage: npm run chat
 */

import { startChatLoop } from '../mcpClient/index.js';

async function main() {
    try {
        await startChatLoop();
    } catch (error) {
        console.error('Error starting chat:', error);
        process.exit(1);
    }
}

main();

