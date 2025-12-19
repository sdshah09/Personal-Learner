import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

export class McpInternalServer {
    private _prisma: PrismaClient;
    private _mcpServer: McpServer;

    constructor(prisma: PrismaClient) {
        this._prisma = prisma;
        this._mcpServer = new McpServer({
            name: "personal-learner",
            version: "1.0.0",
        });
        this.registerTools();
    }

    private registerTools() {
        this._mcpServer.registerTool(
            "saveEntry",
            {
                description: "Save a new entry to the database",
                inputSchema: {
                    userId: z.number(),
                    content: z.string(),
                    domains: z.array(z.number()),
                    domainTags: z.record(z.string(), z.array(z.string())).optional()
                },
                
            },
            async ({ userId, content, domains, domainTags }) => {
                const entry = await this._prisma.entry.create({
                    data: {
                        userId,
                        content,
                        domains,
                        domainTags: domainTags || {}
                    }
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "Entry saved successfully",
                                entryId: entry.id
                            })
                        }
                    ]
                };
            }
        );
        this._mcpServer.registerTool(
            "getAllDomainsofUser",
            {
                description: "Get all the domains(like DSA, System Design) of the user",
                inputSchema: {
                    userId: z.number(),
                }
            },
            async ({ userId }) => {
                const domains = await this._prisma.domain.findMany({
                    where: {
                        userId: userId
                    }
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(domains)
                        }
                    ]
                }
            }
        );
        this._mcpServer.registerTool(
            "getEntriesByDomain",
            {
                description: "Get entries for a specific domain, optionally filtered by date range. Use this for weekly summaries by providing startDate and endDate.",
                inputSchema: {
                    userId: z.number(),
                    domainId: z.number(),
                    startDate: z.string().datetime().optional().describe("Start date (ISO format). Only entries >= this date."),
                    endDate: z.string().datetime().optional().describe("End date (ISO format). Only entries <= this date.")
                }
            },
            async ({ userId, domainId, startDate, endDate }) => {
                const where: any = {
                    userId,
                    domains: { has: domainId }
                };

                if (startDate || endDate) {
                    where.date = {};
                    if (startDate) where.date.gte = new Date(startDate);
                    if (endDate) where.date.lte = new Date(endDate);
                }

                const entries = await this._prisma.entry.findMany({
                    where,
                    orderBy: { date: 'desc' }
                });

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            domainId,
                            count: entries.length,
                            entries,
                            filters: {
                                startDate: startDate || null,
                                endDate: endDate || null
                            }
                        })
                    }]
                };
            }
        );
    }

    get server(): McpServer {
        return this._mcpServer;
    }
}
