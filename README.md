# Personal Learner

An AI-powered daily journaling and progress tracking application that uses Claude AI with MCP (Model Context Protocol) to help users track their learning and work across different domains.

## 🏗️ Architecture

- **Frontend**: React application (user interface)
- **Backend**: Node.js MCP Server (exposes database tools to Claude)
- **AI**: Claude API (MCP Client - calls backend tools)
- **Database**: PostgreSQL (stores users, domains, and entries)
