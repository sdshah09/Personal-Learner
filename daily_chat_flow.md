# Daily Chat Flow

## Overview

This document describes the complete flow of a daily chat interaction, from user input in the React frontend through Claude API, MCP server, database, and back to the user.

## Complete Flow

### Step 1: User Input in React Frontend

User types in the React frontend:

> "I did DSA problems, built Go service, studied load balancing"

### Step 2: Frontend Sends Request to Backend API

React frontend sends HTTP POST request to Node.js backend:

```http
POST /api/chat
Content-Type: application/json

{
  "message": "I did DSA problems, built Go service, studied load balancing",
  "userId": 1
}
```

### Step 3: Backend Receives Request

Node.js backend API endpoint receives the request:
- Extracts `message` and `userId` from request body
- Validates user authentication/authorization
- Prepares to call Claude API

### Step 4: Backend Calls Claude API with MCP Tools

Backend makes request to Claude API (Anthropic):

```javascript
{
  model: "claude-3-5-sonnet-20241022",
  messages: [
    {
      role: "user",
      content: "I did DSA problems, built Go service, studied load balancing"
    }
  ],
  tools: [
    {
      name: "getEntriesByDomain",
      description: "Get user entries filtered by domain",
      input_schema: { ... }
    },
    {
      name: "getEntriesByDateRange",
      description: "Get user entries within date range",
      input_schema: { ... }
    },
    {
      name: "saveEntry",
      description: "Save a new entry for the user",
      input_schema: { ... }
    }
  ],
  tool_choice: "auto"
}
```

**Key Points:**
- Backend includes MCP tool definitions in the request
- Claude can see what tools are available
- `tool_choice: "auto"` allows Claude to decide when to use tools

### Step 5: Claude Receives Message and Tool Definitions

Claude API processes:
- User's message content
- Available MCP tools and their schemas
- Context about the user (userId: 1)

### Step 6: Claude Analyzes and Plans

Claude thinks through the request:

> "User mentioned multiple things, I should:
> - Get their past DSA entries for context
> - Get their past backend work for context  
> - Get their past infra entries for context
> - Ask follow-up questions based on what I find
> - Save everything when done"

### Step 7: Claude Calls MCP Tools (Automatically)

Claude automatically calls multiple MCP tools to gather context:

#### Tool Call 1: Get DSA Entries

```json
{
  "tool": "getEntriesByDomain",
  "arguments": {
    "userId": 1,
    "domainId": 1  // DSA domain ID
  }
}
```

#### Tool Call 2: Get Backend/Founding Engineer Entries

```json
{
  "tool": "getEntriesByDomain",
  "arguments": {
    "userId": 1,
    "domainId": 2  // founding_engineer domain ID
  }
}
```

#### Tool Call 3: Get Infrastructure Entries

```json
{
  "tool": "getEntriesByDomain",
  "arguments": {
    "userId": 1,
    "domainId": 3  // infra domain ID
  }
}
```

### Step 8: MCP Server Queries PostgreSQL Database

MCP server receives tool calls and executes database queries:

#### Query for DSA Entries

```sql
SELECT * FROM entries 
WHERE user_id = 1 
AND domains @> ARRAY[1]
ORDER BY date DESC
LIMIT 10
```

#### Query for Backend Entries

```sql
SELECT * FROM entries 
WHERE user_id = 1 
AND domains @> ARRAY[2]
ORDER BY date DESC
LIMIT 10
```

#### Query for Infra Entries

```sql
SELECT * FROM entries 
WHERE user_id = 1 
AND domains @> ARRAY[3]
ORDER BY date DESC
LIMIT 10
```

### Step 9: Database Returns Past Entries

PostgreSQL returns results to MCP server:

**DSA Entries:**
```json
[
  {
    "id": 5,
    "content": "Solved graph DFS problems. Time complexity was tricky.",
    "domains": [1],
    "date": "2025-12-16"
  }
]
```

**Backend Entries:**
```json
[
  {
    "id": 2,
    "content": "Built Go service, debugged JWT bug, added retry logic.",
    "domains": [2],
    "date": "2025-12-17"
  }
]
```

**Infra Entries:**
```json
[]
```

### Step 10: MCP Server Returns Data to Claude

MCP server formats and returns tool results to Claude API:

```json
{
  "tool_use_id": "toolu_abc123",
  "content": [
    {
      "type": "text",
      "text": "Found 1 DSA entry: Solved graph DFS problems..."
    }
  ]
}
```

### Step 11: Claude Reads Context and Generates Follow-ups

Claude analyzes the past entries and generates personalized follow-up questions:

> "I see you struggled with graph DFS last time. Today you're back to DSA problems—did you work on binary search or something else? 
> 
> And on the Go service, what was the JWT bug you mentioned? Did you fix it today?
> 
> For load balancing, is this your first time studying it, or have you worked with it before?"

### Step 12: User Answers in Frontend

User responds in the React frontend:

> "Yeah, worked on binary search edge cases. JWT issue was token expiration not being handled—fixed it. First time studying load balancing."

### Step 13: Claude Calls saveEntry() Tool

After the conversation, Claude automatically calls the save tool:

```json
{
  "tool": "saveEntry",
  "arguments": {
    "userId": 1,
    "content": "Solved 5 binary search problems. Fixed bounds checking edge case. Built Go service with AWS S3, debugged JWT expiration bug, added retry logic. Studied load balancing basics.",
    "domains": [1, 2, 3],  // DSA, founding_engineer, infra
    "domainTags": {
      "1": ["success", "progress"],
      "2": ["success", "bug-fix"],
      "3": ["new", "learning"]
    },
    "date": "2025-12-17"
  }
}
```

### Step 14: MCP Server Saves to Database

MCP server executes database insert:

```sql
INSERT INTO entries (user_id, content, domains, domain_tags, date, created_at, updated_at)
VALUES (
  1,
  'Solved 5 binary search problems...',
  ARRAY[1, 2, 3],
  '{"1": ["success", "progress"], "2": ["success", "bug-fix"], "3": ["new", "learning"]}'::jsonb,
  '2025-12-17',
  NOW(),
  NOW()
)
```

Database confirms successful insert.

### Step 15: Claude Generates Final Response with Insights

Claude generates a comprehensive response:

> "Great day! You're making real progress on binary search—fixing those edge cases shows you're thinking deeply about the problems. 
> 
> Your backend skills are strong—debugging JWT expiration issues is exactly the kind of real-world problem-solving that matters. 
> 
> Load balancing is a foundational infra concept. Since this is your first time, I'd recommend diving into:
> - Round-robin vs weighted algorithms
> - Health checks and failover
> - Session persistence
> 
> Next week, consider tackling system design—you haven't touched it yet, and it pairs well with your infra learning."

### Step 16: Response Returns to React Frontend

Backend receives Claude's response and sends it to frontend:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Great day! You're making real progress...",
  "entrySaved": true,
  "entryId": 8
}
```

### Step 17: Frontend Displays Response

React frontend receives and displays the response:
- Shows Claude's message in the chat UI
- Updates UI to indicate entry was saved
- May show a success notification

## Architecture Components

### 1. React Frontend
- **Role:** User interface
- **Responsibilities:**
  - Capture user input
  - Send requests to backend API
  - Display Claude's responses
  - Handle user interactions

### 2. Node.js Backend API
- **Role:** API server and MCP server host
- **Responsibilities:**
  - Receive frontend requests
  - Call Claude API with MCP tools
  - Host MCP server endpoints
  - Handle authentication/authorization

### 3. Claude API (Anthropic)
- **Role:** MCP Client
- **Responsibilities:**
  - Process user messages
  - Decide when to call MCP tools
  - Generate intelligent responses
  - Maintain conversation context

### 4. MCP Server (Backend)
- **Role:** Tool provider
- **Responsibilities:**
  - Expose MCP tools (getEntriesByDomain, saveEntry, etc.)
  - Execute database queries
  - Format responses for Claude
  - Handle tool errors

### 5. PostgreSQL Database
- **Role:** Data storage
- **Responsibilities:**
  - Store users, domains, entries
  - Execute queries efficiently
  - Maintain data integrity

## Key MCP Tools

### `getEntriesByDomain(userId, domainId)`
- Fetches user's past entries for a specific domain
- Used for context gathering before asking questions

### `getEntriesByDateRange(userId, startDate, endDate)`
- Fetches entries within a date range
- Used for weekly summaries

### `saveEntry(userId, content, domains, domainTags, date)`
- Saves a new entry to the database
- Called automatically after conversation

### `getWeeklySummary(userId)`
- Aggregates weekly data across all domains
- Used for weekly report generation

## Data Flow Summary

```
User Input
    ↓
React Frontend
    ↓
Node.js Backend API
    ↓
Claude API (with MCP tools)
    ↓
MCP Server (Backend)
    ↓
PostgreSQL Database
    ↓
MCP Server (returns data)
    ↓
Claude API (processes & responds)
    ↓
Node.js Backend API
    ↓
React Frontend
    ↓
User sees response
```

## Benefits of This Architecture

1. **Separation of Concerns:** Each component has a clear responsibility
2. **Scalability:** Can scale frontend, backend, and database independently
3. **Intelligence:** Claude can automatically decide when to fetch context
4. **Efficiency:** Only queries database when needed
5. **User Experience:** Seamless conversation flow with automatic saving

