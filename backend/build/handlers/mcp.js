"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpHandler = void 0;
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const mcpServer_1 = require("../utils/mcpServer");
const db_1 = __importDefault(require("../utils/db"));
const mcpServerInstance = new mcpServer_1.McpInternalServer(db_1.default);
const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
});
mcpServerInstance.server.connect(transport);
const mcpHandler = async (req, res) => {
    console.log("Received MCP Request:", req.body);
    try {
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: "Internal server error",
                },
                id: null,
            });
        }
    }
};
exports.mcpHandler = mcpHandler;
