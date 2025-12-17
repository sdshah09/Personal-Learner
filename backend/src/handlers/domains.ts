import { Request, Response } from 'express';
import prisma from '../utils/db';

export const createDomain = async (req: Request, res: Response) => {
  try {
    const { userId, name, description } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'UserId and name are required' });
    }

    const domain = await prisma.domain.create({
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
  } catch (error: any) {
    console.error('Create domain error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listDomains = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'UserId is required' });
    }

    const domains = await prisma.domain.findMany({
      where: {
        userId: parseInt(userId as string),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      domains,
    });
  } catch (error: any) {
    console.error('List domains error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleDomains = async (req: Request, res: Response) => {
  if (req.method === 'POST') {
    return createDomain(req, res);
  } else if (req.method === 'GET') {
    return listDomains(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};

