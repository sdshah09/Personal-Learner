import type {
    MessageParam,
    Tool,
} from "@anthropic-ai/sdk/resources/messages";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Anthropic } from "@anthropic-ai/sdk";
import * as readline from "readline/promises";

export class McpClient {
    private _mcp: Client;
    private _anthropic: Anthropic;
    private _transport: StreamableHTTPClientTransport;
    private _tools: Tool[] = [];
    private _conversationHistory: MessageParam[] = [];

    constructor(mcp: Client, anthropic: Anthropic, transport: StreamableHTTPClientTransport) {
        this._mcp = mcp;
        this._anthropic = anthropic;
        this._transport = transport;
    }

    public async connectToServer() {
        try {
            await this._mcp.connect(this._transport);

            const toolResults = await this._mcp.listTools();
            this._tools = toolResults.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
            }));
            console.log(
                "Connected to MCP server with tools:",
                this._tools.map(({ name }) => name)
            );
        } catch (e) {
            console.error("Failed to connect to MCP server: ", e);
            throw e;
        }
    }

    private async summarizeMessages(messages: MessageParam[]): Promise<string> {
        const conversationText = messages
            .map((msg) => {
                const role = msg.role === "user" ? "User" : "Assistant";
                const content = typeof msg.content === "string" 
                    ? msg.content 
                    : JSON.stringify(msg.content);
                return `${role}: ${content}`;
            })
            .join("\n");

        const summaryPrompt = `Please provide a concise summary of the following conversation:\n\n${conversationText}`;

        try {
            const summaryResponse = await this._anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 500,
                messages: [{ role: "user", content: summaryPrompt }],
            });

            const summaryText = summaryResponse.content
                .filter((c) => c.type === "text")
                .map((c) => (c.type === "text" ? c.text : ""))
                .join("");

            return summaryText || "Previous conversation summary.";
        } catch (error) {
            console.error("Error summarizing messages:", error);
            return "Previous conversation summary.";
        }
    }

    private async manageHistory() {
        if (this._conversationHistory.length > 5) {
            const messagesToSummarize = this._conversationHistory.slice(0, 5);
            const remainingMessages = this._conversationHistory.slice(5);

            const summary = await this.summarizeMessages(messagesToSummarize);

            this._conversationHistory = [
                {
                    role: "user",
                    content: `[Previous conversation summary]: ${summary}`,
                },
                ...remainingMessages,
            ];
        }
    }

    private async processQuery(query: string) {
        // Add user query to history
        this._conversationHistory.push({
            role: "user",
            content: query,
        });

        // Manage history - summarize if > 5 messages
        await this.manageHistory();

        // Use conversation history for the request
        const messages: MessageParam[] = [...this._conversationHistory];

        const response = await this._anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages,
            tools: this._tools,
        });

        const finalText: string[] = [];

        // Collect all tool_use blocks and process them
        const toolUseItems = response.content.filter((c) => c.type === "tool_use");
        const textItems = response.content.filter((c) => c.type === "text");

        // Add text content to output
        for (const textItem of textItems) {
            if (textItem.type === "text") {
                finalText.push(textItem.text);
            }
        }

        // Process tool calls if any
        if (toolUseItems.length > 0) {
            // Add assistant message with tool_use blocks to history
            this._conversationHistory.push({
                role: "assistant",
                content: toolUseItems,
            });

            // Process all tool calls
            const toolResults: Array<{
                type: "tool_result";
                tool_use_id: string;
                content: string;
            }> = [];

            for (const toolUse of toolUseItems) {
                if (toolUse.type === "tool_use") {
                    const toolName = toolUse.name;
                    const toolArgs = toolUse.input as { [x: string]: unknown } | undefined;

                    try {
                        const result = await this._mcp.callTool({
                            name: toolName,
                            arguments: toolArgs,
                        });

                        finalText.push(
                            `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
                        );

                        // Extract text from MCP result
                        let contentText = "";
                        if (typeof result.content === "string") {
                            contentText = result.content;
                        } else if (Array.isArray(result.content)) {
                            contentText = result.content
                                .filter((c: any) => c.type === "text")
                                .map((c: any) => c.text || "")
                                .join("");
                        }

                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: toolUse.id,
                            content: contentText,
                        });
                    } catch (error) {
                        console.error(`Error calling tool ${toolName}:`, error);
                        finalText.push(
                            `[Error calling tool ${toolName}: ${error instanceof Error ? error.message : String(error)}]`
                        );
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: toolUse.id,
                            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        });
                    }
                }
            }

            // Add tool results to history
            this._conversationHistory.push({
                role: "user",
                content: toolResults,
            });

            // Get follow-up response with all tool results
            const followUpResponse = await this._anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [...this._conversationHistory],
                tools: this._tools,
            });

            const followUpText = followUpResponse.content
                .filter((c) => c.type === "text")
                .map((c) => (c.type === "text" ? c.text : ""))
                .join("");

            finalText.push(followUpText);

            // Add follow-up response to history
            this._conversationHistory.push({
                role: "assistant",
                content: followUpResponse.content.filter((c) => c.type === "text"),
            });
        } else {
            // No tool calls - add assistant response to history
            this._conversationHistory.push({
                role: "assistant",
                content: textItems,
            });
        }

        return finalText.join("\n");
    }

    /**
     * Start a continuous chat loop in the terminal
     * Type 'quit' to exit
     */
    public async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");
            // Reset conversation history for new chat session
            this._conversationHistory = [];

            while (true) {
                const message = await rl.question("\nQuery: ");
                if (message.toLowerCase() === "quit") {
                    break;
                }
                const response = await this.processQuery(message);
                console.log("\n" + response);
            }
        } finally {
            rl.close();
        }
    }

    /**
     * Call an MCP tool directly
     */
    public async callTool(toolName: string, input: any): Promise<any> {
        try {
            const result = await this._mcp.callTool({
                name: toolName,
                arguments: input,
            });
            return result;
        } catch (error) {
            console.error(`Error calling tool ${toolName}:`, error);
            throw error;
        }
    }

    /**
     * Get available tools
     */
    public getTools(): Tool[] {
        return this._tools;
    }

    /**
     * Reset conversation history
     */
    public resetHistory() {
        this._conversationHistory = [];
    }

    /**
     * Cleanup and close the MCP connection
     */
    public async cleanup() {
        await this._mcp.close();
    }
}
