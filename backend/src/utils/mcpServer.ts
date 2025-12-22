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
            "saveDomains",
            {
                description: "Save domains of user when you are saving entry also. Creates domain if it doesn't exist, returns existing domain if it does.",
                inputSchema: {
                    userId: z.number(),
                    name: z.string()
                },
            },
            async ({ userId, name }) => {
                try {
                    if (!userId || !name) {
                        throw new Error("userId and name are required");
                    }

                    let domain = await this._prisma.domain.findFirst({
                        where: {
                            userId: userId,
                            name: name.trim()
                        }
                    });

                    const isNew = !domain;

                    if (!domain) {
                        domain = await this._prisma.domain.create({
                            data: {
                                userId,
                                name: name.trim(),
                                description: null
                            }
                        });
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: true,
                                    message: isNew ? "Domain created successfully" : "Domain already exists",
                                    domainId: domain.id,
                                    name: domain.name,
                                    userId: domain.userId
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    console.error("Error saving domain:", error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    error: error.message || "Failed to save domain"
                                })
                            }
                        ]
                    };
                }
            }
        );
        this._mcpServer.registerTool(
            "saveMultipleDomains",
            {
                description: "Save multiple domains for a user. Creates domains that don't exist, skips existing ones. Does not overwrite existing domains.",
                inputSchema: {
                    userId: z.number(),
                    domainNames: z.array(z.string()).describe("Array of domain names to save (e.g., ['DSA', 'System Design', 'React'])")
                },
            },
            async ({ userId, domainNames }) => {
                try {
                    if (!userId || !domainNames || domainNames.length === 0) {
                        throw new Error("userId and domainNames array are required");
                    }

                    const results = [];
                    const created = [];
                    const existing = [];

                    for (const domainName of domainNames) {
                        const trimmedName = domainName.trim();
                        if (!trimmedName) continue;

                        // Check if domain already exists
                        let domain = await this._prisma.domain.findFirst({
                            where: {
                                userId: userId,
                                name: trimmedName
                            }
                        });

                        if (!domain) {
                            // Create new domain if it doesn't exist
                            domain = await this._prisma.domain.create({
                                data: {
                                    userId,
                                    name: trimmedName,
                                    description: null
                                }
                            });
                            created.push({
                                domainId: domain.id,
                                name: domain.name,
                                userId: domain.userId
                            });
                        } else {
                            // Domain already exists, don't overwrite
                            existing.push({
                                domainId: domain.id,
                                name: domain.name,
                                userId: domain.userId
                            });
                        }

                        results.push({
                            domainId: domain.id,
                            name: domain.name,
                            userId: domain.userId,
                            wasNew: !existing.some(e => e.domainId === domain!.id)
                        });
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: true,
                                    message: `Processed ${domainNames.length} domains`,
                                    created: created.length,
                                    existing: existing.length,
                                    domains: results,
                                    createdDomains: created,
                                    existingDomains: existing
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    console.error("Error saving multiple domains:", error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    error: error.message || "Failed to save domains"
                                })
                            }
                        ]
                    };
                }
            }
        );
        this._mcpServer.registerTool(
            "saveEntry",
            {
                description: "Save a new entry to the database when the user says they are done with this conversation",
                inputSchema: {
                    userId: z.number(),
                    content: z.string(),
                    domains: z.array(z.number()),
                    domainTags: z.record(z.string(), z.array(z.string())).optional()
                },

            },
            async ({ userId, content, domains, domainTags }) => {
                try {
                    if (!userId || !content || !domains || domains.length === 0) {
                        throw new Error("userId, content, and domains are required");
                    }

                    const entry = await this._prisma.entry.create({
                        data: {
                            userId,
                            content,
                            domains,
                            domainTags: domainTags || {},
                        }
                    });

                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: true,
                                    message: "Entry saved successfully",
                                    entryId: entry.id,
                                    userId: entry.userId,
                                    domains: entry.domains
                                })
                            }
                        ]
                    };
                } catch (error: any) {
                    console.error("Error saving entry:", error);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    error: error.message || "Failed to save entry",
                                    details: error.code || "UNKNOWN_ERROR"
                                })
                            }
                        ]
                    };
                }
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
