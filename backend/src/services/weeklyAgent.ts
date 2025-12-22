import * as cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import type { Anthropic } from '@anthropic-ai/sdk';
import { McpClient } from '../mcpClient/mcpClient';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export class WeeklyAgent {
    private prisma: PrismaClient;
    private anthropic: Anthropic;
    private mcpClient: McpClient;

    constructor(prisma: PrismaClient, anthropic: Anthropic, mcpClient: McpClient) {
        this.prisma = prisma;
        this.anthropic = anthropic;
        this.mcpClient = mcpClient;
    }

    public startWeeklyAgentLoop() {
        // Run every Sunday at 6 PM
        cron.schedule('0 18 * * 0', async () => {
            console.log('Weekly agent starting...');
            try {
                const users = await this.prisma.user.findMany();
                
                for (const user of users) {
                    await this.generateWeeklySummary(user.id);
                }
            } catch (error) {
                console.error('Error in weekly agent:', error);
            }
        });

        console.log('Weekly agent scheduled (Sundays 6 PM)');
    }

    private async generateWeeklySummary(userId: number) {
        console.log(`Generating weekly summary for user ${userId}`);

        const messages: MessageParam[] = [
            {
                role: "user",
                content: `You are a learning coach. Generate a detailed weekly summary for user ${userId}:

1. Get all domains for the user using getAllDomainsofUser
2. For each domain, fetch entries from the past 7 days using getEntriesByDomain with startDate and endDate
3. Analyze patterns: what went well, what was challenging
4. Generate personalized recommendations for next week
5. Provide encouragement and insights

Be thorough and insightful. Use the available tools to gather data.`,
            },
        ];

        let currentResponse = await this.anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            messages,
            tools: this.mcpClient.getTools(),
        });

        // Process tool calls until completion
        while (currentResponse.stop_reason === 'tool_use') {
            const toolUseItems = currentResponse.content.filter((c: any) => c.type === 'tool_use');
            
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
                            ...(toolUse.input as Record<string, unknown>),
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
                        console.error(`Error in weekly agent tool call:`, error);
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: toolUse.id,
                            content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                        });
                    }
                }
            }

            // Add messages for follow-up
            const followUpMessages: MessageParam[] = [
                ...messages,
                {
                    role: "assistant",
                    content: currentResponse.content,
                },
                {
                    role: "user",
                    content: toolResults,
                },
            ];

            // Continue conversation
            currentResponse = await this.anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2048,
                messages: followUpMessages,
                tools: this.mcpClient.getTools(),
            });
        }

        // Extract final summary text
        const summaryText = currentResponse.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => (c.type === "text" ? c.text : ""))
            .join("");

        console.log(`Weekly summary completed for user ${userId}`);
        console.log(`Summary: ${summaryText.substring(0, 200)}...`);

        // TODO: Save summary to database or send notification
        return summaryText;
    }
}

