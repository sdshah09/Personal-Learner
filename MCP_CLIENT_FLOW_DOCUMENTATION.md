# MCP Client Flow Documentation

This document traces the complete flow in `mcpClient.ts` with a concrete example, showing what gets stored at each step.

## Complete Flow Example: "What domains do I have?"

### Initial State
```javascript
// mcpClient.ts line 15
this._conversationHistory = []  // Empty array
```

---

### Step 1: User sends message → stored in history

**User types:** `"What domains do I have?"`

**Code:** `mcpClient.ts:94-97`
```typescript
this._conversationHistory.push({
    role: "user",
    content: "What domains do I have?"
});
```

**Stored in `_conversationHistory`:**
```javascript
[
    {
        role: "user",
        content: "What domains do I have?"
    }
]
```

---

### Step 2: History management (if > 5 messages)

**Code:** `mcpClient.ts:99-100`
```typescript
await this.manageHistory();  // No action if ≤ 5 messages
```

**History unchanged** (only 1 message)

---

### Step 3: Claude API call with tools

**Code:** `mcpClient.ts:105-110`
```typescript
const response = await this._anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
        { role: "user", content: "What domains do I have?" }
    ],
    tools: [
        {
            name: "getAllDomainsofUser",
            description: "Get all the domains...",
            input_schema: { userId: z.number() }
        },
        // ... other tools
    ]
});
```

**What Claude sees:**
- User message
- Available tools (including `getAllDomainsofUser`)

---

### Step 4: Claude decides to use tool

**Claude Response:**
```javascript
{
    content: [
        {
            type: "tool_use",
            id: "toolu_abc123xyz",
            name: "getAllDomainsofUser",
            input: {
                userId: 1
            }
        }
    ]
}
```

**Code:** `mcpClient.ts:115-116`
```typescript
const toolUseItems = response.content.filter((c) => c.type === "tool_use");
// toolUseItems = [{ type: "tool_use", id: "toolu_abc123xyz", name: "getAllDomainsofUser", input: { userId: 1 } }]

const textItems = response.content.filter((c) => c.type === "text");
// textItems = []  // No text in this response
```

**Code:** `mcpClient.ts:119-123` - No text to add
```typescript
// finalText = []  // Empty, no text items
```

---

### Step 5: Store tool_use in history

**Code:** `mcpClient.ts:128-131`
```typescript
this._conversationHistory.push({
    role: "assistant",
    content: toolUseItems  // The tool_use array
});
```

**Stored in `_conversationHistory`:**
```javascript
[
    {
        role: "user",
        content: "What domains do I have?"
    },
    {
        role: "assistant",
        content: [
            {
                type: "tool_use",
                id: "toolu_abc123xyz",
                name: "getAllDomainsofUser",
                input: { userId: 1 }
            }
        ]
    }
]
```

---

### Step 6: Call MCP Server tool

**Code:** `mcpClient.ts:146-149`
```typescript
const result = await this._mcp.callTool({
    name: "getAllDomainsofUser",
    arguments: { userId: 1 }
});
```

**What happens:**
- HTTP request to MCP Server
- MCP Server queries database
- MCP Server returns result

**MCP Server Response** (from `mcpServer.ts:249-256`):
```javascript
{
    content: [
        {
            type: "text",
            text: '[{"id":1,"userId":1,"name":"DSA","description":null},{"id":2,"userId":1,"name":"React","description":null}]'
        }
    ]
}
```

---

### Step 7: Extract text from MCP result

**Code:** `mcpClient.ts:155-164`
```typescript
// Extract text from MCP result
let contentText = "";
if (typeof result.content === "string") {
    contentText = result.content;
} else if (Array.isArray(result.content)) {
    // THIS BRANCH EXECUTES
    contentText = result.content
        .filter((c: any) => c.type === "text")  // Keeps: [{ type: "text", text: "..." }]
        .map((c: any) => c.text || "")          // Extracts: ["[{...}]"]
        .join("");                              // Joins: "[{...}]"
}

// contentText = '[{"id":1,"userId":1,"name":"DSA","description":null},{"id":2,"userId":1,"name":"React","description":null}]'
```

**Debug output** (line 151-153):
```typescript
finalText.push(`[Calling tool getAllDomainsofUser with args {"userId":1}]`);
// finalText = ["[Calling tool getAllDomainsofUser with args {\"userId\":1}]"]
```

---

### Step 8: Create tool_result

**Code:** `mcpClient.ts:166-170`
```typescript
toolResults.push({
    type: "tool_result",
    tool_use_id: "toolu_abc123xyz",  // Matches the tool_use id
    content: contentText  // The extracted JSON string
});
```

**toolResults array:**
```javascript
[
    {
        type: "tool_result",
        tool_use_id: "toolu_abc123xyz",
        content: '[{"id":1,"userId":1,"name":"DSA","description":null},{"id":2,"userId":1,"name":"React","description":null}]'
    }
]
```

---

### Step 9: Store tool_result in history

**Code:** `mcpClient.ts:186-189`
```typescript
this._conversationHistory.push({
    role: "user",
    content: toolResults  // The tool_result array
});
```

**Stored in `_conversationHistory`:**
```javascript
[
    {
        role: "user",
        content: "What domains do I have?"
    },
    {
        role: "assistant",
        content: [
            {
                type: "tool_use",
                id: "toolu_abc123xyz",
                name: "getAllDomainsofUser",
                input: { userId: 1 }
            }
        ]
    },
    {
        role: "user",
        content: [
            {
                type: "tool_result",
                tool_use_id: "toolu_abc123xyz",
                content: '[{"id":1,"userId":1,"name":"DSA","description":null},{"id":2,"userId":1,"name":"React","description":null}]'
            }
        ]
    }
]
```

---

### Step 10: Claude generates final response

**Code:** `mcpClient.ts:192-197`
```typescript
const followUpResponse = await this._anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [...this._conversationHistory],  // All 3 messages above
    tools: this._tools,
});
```

**What Claude sees:**
1. User: "What domains do I have?"
2. Assistant: [tool_use for getAllDomainsofUser]
3. User: [tool_result with JSON data]

**Claude Response:**
```javascript
{
    content: [
        {
            type: "text",
            text: "You have 2 domains: DSA and React."
        }
    ]
}
```

---

### Step 11: Extract final text

**Code:** `mcpClient.ts:199-202`
```typescript
const followUpText = followUpResponse.content
    .filter((c) => c.type === "text")      // Keeps text items
    .map((c) => (c.type === "text" ? c.text : ""))  // Extracts text
    .join("");                              // Joins into string

// followUpText = "You have 2 domains: DSA and React."
```

**Code:** `mcpClient.ts:204`
```typescript
finalText.push(followUpText);
// finalText = [
//     "[Calling tool getAllDomainsofUser with args {\"userId\":1}]",
//     "You have 2 domains: DSA and React."
// ]
```

---

### Step 12: Store final response in history

**Code:** `mcpClient.ts:207-210`
```typescript
this._conversationHistory.push({
    role: "assistant",
    content: followUpResponse.content.filter((c) => c.type === "text")
});
```

**Final `_conversationHistory`:**
```javascript
[
    {
        role: "user",
        content: "What domains do I have?"
    },
    {
        role: "assistant",
        content: [
            {
                type: "tool_use",
                id: "toolu_abc123xyz",
                name: "getAllDomainsofUser",
                input: { userId: 1 }
            }
        ]
    },
    {
        role: "user",
        content: [
            {
                type: "tool_result",
                tool_use_id: "toolu_abc123xyz",
                content: '[{"id":1,"userId":1,"name":"DSA","description":null},{"id":2,"userId":1,"name":"React","description":null}]'
            }
        ]
    },
    {
        role: "assistant",
        content: [
            {
                type: "text",
                text: "You have 2 domains: DSA and React."
            }
        ]
    }
]
```

---

### Step 13: Return final text to user

**Code:** `mcpClient.ts:219`
```typescript
return finalText.join("\n");
```

**Final output:**
```
[Calling tool getAllDomainsofUser with args {"userId":1}]
You have 2 domains: DSA and React.
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                              │
│    "What domains do I have?"                               │
│    ↓ Stored in _conversationHistory[0]                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CLAUDE API CALL                                         │
│    messages: [user message]                                │
│    tools: [getAllDomainsofUser, ...]                      │
│    ↓                                                        │
│ 3. CLAUDE RESPONSE                                         │
│    { content: [{ type: "tool_use", name: "getAllDomainsofUser" }] } │
│    ↓ Stored in _conversationHistory[1]                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. MCP CLIENT CALLS MCP SERVER                             │
│    this._mcp.callTool({ name: "getAllDomainsofUser", ... }) │
│    ↓                                                        │
│ 5. MCP SERVER QUERIES DATABASE                             │
│    Prisma finds domains for userId: 1                      │
│    ↓                                                        │
│ 6. MCP SERVER RETURNS                                      │
│    { content: [{ type: "text", text: "[{...}]" }] }       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. CLIENT EXTRACTS TEXT (Lines 155-164)                    │
│    Filter → Map → Join                                     │
│    contentText = "[{...}]"                                 │
│    ↓                                                        │
│ 8. CREATE tool_result                                      │
│    { type: "tool_result", content: "[{...}]" }            │
│    ↓ Stored in _conversationHistory[2]                     │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. CLAUDE GENERATES FINAL RESPONSE                         │
│    "You have 2 domains: DSA and React."                     │
│    ↓ Stored in _conversationHistory[3]                     │
│    ↓ Added to finalText                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. RETURN TO USER                                         │
│     finalText.join("\n")                                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Storage Points

1. **Line 94-97**: User message → `_conversationHistory[0]`
2. **Line 128-131**: Tool use → `_conversationHistory[1]`
3. **Line 186-189**: Tool result → `_conversationHistory[2]`
4. **Line 207-210**: Final response → `_conversationHistory[3]`

## Critical Conversion Point

The conversion from MCP server format to text happens at **lines 155-164**, ensuring Claude receives plain text content:

```typescript
// Extract text from MCP result
let contentText = "";
if (typeof result.content === "string") {
    contentText = result.content;
} else if (Array.isArray(result.content)) {
    contentText = result.content
        .filter((c: any) => c.type === "text")  // Filter for text items
        .map((c: any) => c.text || "")          // Extract text property
        .join("");                              // Join into single string
}
```

This ensures that regardless of how the MCP server returns data (as a string or as an array of content blocks), it gets converted to a plain text string that Claude can process and respond to naturally.

## Message Pattern

The conversation history follows this pattern for tool calls:

1. **User message** (role: "user", content: string)
2. **Assistant tool_use** (role: "assistant", content: [{ type: "tool_use", ... }])
3. **Tool result** (role: "user", content: [{ type: "tool_result", ... }])
4. **Assistant final response** (role: "assistant", content: [{ type: "text", ... }])

This pattern allows Claude to maintain context across tool calls and generate natural language responses based on tool results.

