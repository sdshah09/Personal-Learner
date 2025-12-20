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

    constructor(mcp: Client, anthropic: Anthropic, transport: StreamableHTTPClientTransport) {
        this._mcp = mcp;
        this._anthropic = anthropic;
        this._transport = transport;
    }

    public async connectToServer() {
        try {
            await this._mcp.connect(this._transport);

            const toolResults = await this._mcp.listTools();
            this._tools = toolResults.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                };
            });
            console.log(
                "Connected to MCP server with tools:",
                this._tools.map(({ name }) => name)
            );
        } catch (e) {
            console.error("Failed to connect to MCP server: ", e);
            throw e;
        }
    }

    private async processQuery(query: string) {
        const messages: MessageParam[] = [
            {
                role: "user",
                content: query
            }
        ];

        const response = await this._anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages,
            tools: this._tools
        });

        const finalText = [];

        for (const content of response.content) {
            if (content.type == "text") {
                finalText.push(content.text);
            } else if (content.type == "tool_use") {
                const toolName = content.name;
                const toolArgs = content.input as { [x: string]: unknown } | undefined;

                const result = await this._mcp.callTool({
                    name: toolName,
                    arguments: toolArgs
                });

                finalText.push(
                    `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
                );

                messages.push({
                    role: "user",
                    content: result.content as string,
                });

                const response = await this._anthropic.messages.create({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages,
                });

                finalText.push(
                    response.content[0].type === "text" ? response.content[0].text : ""
                );
            }
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
     * Cleanup and close the MCP connection
     */
    public async cleanup() {
        await this._mcp.close();
    }
}