import { McpClient } from '../mcpClient/mcpClient';
import type { Anthropic } from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export class ChatService {
    private mcpClient: McpClient;
    private anthropic: Anthropic;
    private userHistories: Map<number, MessageParam[]> = new Map();

    constructor(mcpClient: McpClient, anthropic: Anthropic) {
        this.mcpClient = mcpClient;
        this.anthropic = anthropic;
    }

    async processUserMessage(userId: number, userMessage: string): Promise<string> {
        // Get or create conversation history for this user
        let conversationHistory = this.userHistories.get(userId) || [];

        // Initialize system prompt on first message
        if (conversationHistory.length === 0) {
            conversationHistory.push({
                role: "user",
                content: `You are a personal learning coach helping user ${userId} track their learning activities.

When a user tells you what they learned or worked on:
1. Extract domains/topics mentioned (e.g., DSA, System Design, React, Backend, etc.)
2. Ask 2-3 clarifying questions to gather complete information
3. When the conversation feels complete and you have all details:
   - Call saveMultipleDomains with all domain names mentioned
   - Call saveEntry with a complete summary of what they did
   - Confirm the entry was saved successfully

Be conversational and helpful. Only save when you have complete information.`,
            });
        }

        // Add user message to history
        conversationHistory.push({
            role: "user",
            content: userMessage,
        });

        // Manage history - summarize if > 5 messages
        // IMPORTANT: Don't break tool_use/tool_result pairs
        if (conversationHistory.length > 5) {
            let splitIndex = 5;
            
            // Check if the last message to summarize is an assistant message with tool_use
            // If so, we need to include the next user message (which has tool_result)
            if (splitIndex < conversationHistory.length) {
                const lastMessageToSummarize = conversationHistory[splitIndex - 1];
                if (lastMessageToSummarize.role === "assistant" && 
                    Array.isArray(lastMessageToSummarize.content)) {
                    const hasToolUse = lastMessageToSummarize.content.some(
                        (c: any) => c.type === "tool_use"
                    );
                    if (hasToolUse && splitIndex < conversationHistory.length) {
                        // Include the tool_result message that follows
                        splitIndex++;
                    }
                }
            }

            const messagesToSummarize = conversationHistory.slice(0, splitIndex);
            const remainingMessages = conversationHistory.slice(splitIndex);

            const summary = await this.summarizeMessages(messagesToSummarize);

            conversationHistory = [
                {
                    role: "user",
                    content: `[Previous conversation summary]: ${summary}`,
                },
                ...remainingMessages,
            ];
        }

        // Call Claude with conversation history
        const response = await this.anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            messages: conversationHistory,
            tools: this.mcpClient.getTools(),
        });

        // Process response and tool calls
        const result = await this.handleToolCalls(response, userId, conversationHistory);
        
        // Update conversation history
        this.userHistories.set(userId, result.history);

        return result.text;
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
            const summaryResponse = await this.anthropic.messages.create({
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

    private async handleToolCalls(
        response: any,
        userId: number,
        conversationHistory: MessageParam[]
    ): Promise<{ text: string; history: MessageParam[] }> {
        let currentResponse = response;
        let finalText: string[] = [];
        let history = [...conversationHistory];

        // Add assistant response to history
        history.push({
            role: "assistant",
            content: currentResponse.content,
        });

        // Extract text content
        const textItems = currentResponse.content.filter((c: any) => c.type === "text");
        for (const item of textItems) {
            if (item.type === "text") {
                finalText.push(item.text);
            }
        }

        // Process tool calls in a loop until no more tool_use
        while (true) {
            const toolUseItems = currentResponse.content.filter((c: any) => c.type === "tool_use");
            
            if (toolUseItems.length === 0) {
                break;
            }

            const toolResults: Array<{
                type: "tool_result";
                tool_use_id: string;
                content: string;
            }> = [];

            // Execute all tool calls
            for (const toolUse of toolUseItems) {
                if (toolUse.type === "tool_use") {
                    try {
                        // Add userId to tool input
                        const toolInput = {
                            ...toolUse.input,
                            userId,
                        };

                        const result = await this.mcpClient.callTool(toolUse.name, toolInput);

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
                        console.error(`Error calling tool ${toolUse.name}:`, error);
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: toolUse.id,
                            content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                        });
                    }
                }
            }

            // Add tool results to history
            history.push({
                role: "user",
                content: toolResults,
            });

            // Get follow-up response
            currentResponse = await this.anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2048,
                messages: history,
                tools: this.mcpClient.getTools(),
            });

            // Add follow-up response to history
            history.push({
                role: "assistant",
                content: currentResponse.content,
            });

            // Extract text from follow-up
            const followUpText = currentResponse.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => (c.type === "text" ? c.text : ""))
                .join("");

            if (followUpText) {
                finalText.push(followUpText);
            }
        }

        return {
            text: finalText.join("\n"),
            history,
        };
    }

    resetUserHistory(userId: number) {
        this.userHistories.delete(userId);
    }
}

