# Testing Guide - How to Test the Chat Flow

## Prerequisites

1. **Install dependencies** (if not already done):
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables** in `.env`:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/personal_learner
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   MCP_SERVER_URL=http://localhost:3000/mcp
   PORT=3000
   ```

3. **Start your database** (PostgreSQL)

4. **Run Prisma migrations**:
   ```bash
   npx prisma migrate dev
   ```

## Testing Methods

### Method 1: Terminal Chat (CLI) - **Recommended for Testing**

No frontend needed! Use the built-in chat loop:

**Step 1: Start the Express server** (in one terminal):
```bash
cd backend
npm run dev
```

**Step 2: Start the chat client** (in another terminal):
```bash
cd backend
npm run chat
```

**Step 3: Chat!**
```
MCP Client Started!
Type your queries or 'quit' to exit.

Query: Give me weekly summary
[Claude processes and calls MCP tools...]

Query: I did DSA problems today
[Claude responds and saves entry...]

Query: quit
```

### Method 2: Direct API Testing with curl

**Step 1: Start the server**:
```bash
npm run dev
```

**Step 2: Test MCP endpoint directly**:
```bash
# List available tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Call a tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getAllDomainsofUser",
      "arguments": {
        "userId": 1
      }
    }
  }'
```

### Method 3: Create a Simple Test Script

Create `backend/src/scripts/testChat.ts`:
```typescript
import { createMcpClient } from '../mcpClient/index.js';

async function test() {
    const client = await createMcpClient();
    
    // Test single query
    const response = await client.processQuery("Give me weekly summary");
    console.log(response);
    
    await client.cleanup();
}

test();
```

Run it:
```bash
npm run build
node build/scripts/testChat.js
```

## What to Test

### 1. Basic Chat
```
Query: Hello, what can you do?
```
Expected: Claude introduces itself and explains available tools

### 2. Get Domains
```
Query: What domains do I have?
```
Expected: Claude calls `getAllDomainsofUser` and lists your domains

### 3. Weekly Summary
```
Query: Give me weekly summary
```
Expected: 
- Claude calls `getAllDomainsofUser`
- For each domain, calls `getEntriesByDomain` with date range
- Generates a summary

### 4. Save Entry
```
Query: I did DSA problems today, solved 5 binary search questions
```
Expected:
- Claude asks follow-up questions
- Eventually calls `saveEntry` to save the entry
- Confirms entry saved

## Troubleshooting

### Error: "Failed to connect to MCP server"
- Make sure Express server is running (`npm run dev`)
- Check `MCP_SERVER_URL` in `.env` matches server port
- Verify `/mcp` endpoint is accessible

### Error: "Claude API Key not present"
- Add `ANTHROPIC_API_KEY` to `.env` file
- Restart the process

### Error: "Cannot find module"
- Run `npm install` to install dependencies
- Run `npm run build` to compile TypeScript

### Tools not showing up
- Check MCP server is connected: `curl http://localhost:3000/mcp` (should return JSON-RPC response)
- Check `mcpServer.ts` has tools registered
- Check `connectToServer()` is being called

## Quick Start Commands

```bash
# Terminal 1: Start server
cd backend
npm run dev

# Terminal 2: Start chat
cd backend
npm run chat
```

That's it! You can now chat with Claude using your MCP tools without any frontend.

