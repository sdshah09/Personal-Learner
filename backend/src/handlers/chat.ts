import { Request, Response } from 'express';
import { ChatService } from '../services/chatService';

export const createChatHandler = (chatService: ChatService) => {
    return async (req: Request, res: Response) => {
        try {
            const { message, userId } = req.body;

            if (!message || !userId) {
                return res.status(400).json({
                    error: 'message and userId are required'
                });
            }

            const response = await chatService.processUserMessage(userId, message);
            
            res.json({ 
                response,
                success: true
            });
        } catch (error) {
            console.error('Error in chat handler:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false
            });
        }
    };
};

