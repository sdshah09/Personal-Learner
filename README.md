# Personal Learner

A conversational AI-powered learning tracker that helps you log and organize your daily learning activities through natural language conversations.

## What Does This Project Do?

Personal Learner is an intelligent learning journal that uses AI to help you track what you learn each day. Instead of manually filling out forms, you simply chat with an AI coach that:

- **Conversationally captures** what you learned or worked on
- **Automatically categorizes** your learning into domains (e.g., DSA, React, System Design, Backend)
- **Asks clarifying questions** to gather complete information
- **Saves structured entries** to your learning journal
- **Generates weekly summaries** of your learning progress

### Example Interaction

**You:** "I worked on binary trees today and solved 3 LeetCode problems"

**AI Coach:** "Great! What specific topics did you cover in binary trees? Were there any concepts you found challenging?"

**You:** "I focused on tree traversal and struggled with iterative solutions"

**AI Coach:** "Perfect! I've saved your entry. You worked on DSA (binary trees, tree traversal) today."

## Tech Stack

### Backend
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js - RESTful API server
- **AI/LLM:** 
  - Anthropic Claude (Claude Sonnet 4) - Conversational AI
  - Model Context Protocol (MCP) - Tool integration framework
- **Database:** 
  - PostgreSQL - Relational database
  - Prisma ORM - Database access and migrations
- **Authentication:** bcrypt - Password hashing
- **Validation:** Zod - Schema validation

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite - Fast development and build tooling
- **UI:** Custom React components with CSS

### Architecture
- **MCP Server:** Internal MCP server that exposes database operations as tools
- **MCP Client:** Client that connects to the MCP server and integrates with Claude API
- **Chat Service:** Manages conversation history and orchestrates AI interactions
- **REST API:** Express endpoints for frontend communication

## Project Structure

```
Personal-Learner/
├── backend/          # Node.js/Express backend
│   ├── src/
│   │   ├── handlers/     # API route handlers
│   │   ├── services/     # Business logic (chat, weekly agent)
│   │   ├── mcpClient/    # MCP client implementation
│   │   └── utils/        # MCP server and database utilities
│   └── prisma/       # Database schema and migrations
├── frontend/         # React frontend
│   └── src/
│       └── components/    # React UI components
└── README.md
```

## Key Features

1. **Natural Language Learning Logging** - Chat naturally instead of filling forms
2. **Domain Categorization** - Automatically organizes learning by topic
3. **Conversation History** - Maintains context across chat sessions
4. **Weekly Summaries** - AI-generated summaries of weekly learning progress
5. **User Authentication** - Secure user accounts and data isolation

## How It Works

1. **User chats** with the AI through the frontend
2. **Backend receives** the message and sends it to Claude API
3. **Claude analyzes** the message and decides if tools are needed
4. **MCP tools** are called to interact with the database (save domains, save entries)
5. **Tool results** are sent back to Claude
6. **Claude generates** a natural language response
7. **Response** is returned to the user

The system uses Model Context Protocol (MCP) to bridge Claude's AI capabilities with database operations, allowing Claude to save and retrieve learning data seamlessly.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Anthropic API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Set up environment variables (`.env` files)
4. Run database migrations:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

6. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## License

ISC
