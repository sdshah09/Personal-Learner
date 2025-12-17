"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const healthCheck = async (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
};
exports.healthCheck = healthCheck;
