"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDomains = exports.listDomains = exports.createDomain = void 0;
const db_1 = __importDefault(require("../utils/db"));
const createDomain = async (req, res) => {
    try {
        const { userId, name, description } = req.body;
        if (!userId || !name) {
            return res.status(400).json({ error: 'UserId and name are required' });
        }
        const domain = await db_1.default.domain.create({
            data: {
                userId,
                name,
                description: description || null,
            },
        });
        res.status(201).json({
            message: 'Domain created successfully',
            domain: {
                id: domain.id,
                userId: domain.userId,
                name: domain.name,
                description: domain.description,
                createdAt: domain.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Create domain error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createDomain = createDomain;
const listDomains = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'UserId is required' });
        }
        const domains = await db_1.default.domain.findMany({
            where: {
                userId: parseInt(userId),
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.status(200).json({
            domains,
        });
    }
    catch (error) {
        console.error('List domains error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.listDomains = listDomains;
const handleDomains = async (req, res) => {
    if (req.method === 'POST') {
        return (0, exports.createDomain)(req, res);
    }
    else if (req.method === 'GET') {
        return (0, exports.listDomains)(req, res);
    }
    else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};
exports.handleDomains = handleDomains;
