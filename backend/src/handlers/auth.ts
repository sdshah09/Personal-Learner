import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/db';

export const signup = async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password, and email are required' });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Store user in database
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        email,
      },
    });

    // Return success (don't return password hash)
    res.status(201).json({
      message: 'User created successfully',
      userId: user.id,
      username: user.username,
    });
  } catch (error: any) {
    // Handle duplicate username or email error
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'username') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (field === 'email') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(400).json({ error: 'User already exists' });
    }
    
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Return success (don't return password hash)
    res.status(200).json({
      message: 'Login successful',
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

