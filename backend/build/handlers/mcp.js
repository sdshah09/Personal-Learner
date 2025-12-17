"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpHandler = void 0;
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
});
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
