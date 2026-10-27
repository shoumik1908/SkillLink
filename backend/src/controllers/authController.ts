import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'skilllink-dev-secret-key-change-in-production-2026';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  college: z.string().min(2, 'College is required'),
  yearOfStudy: z.number().int().min(1).max(6),
  skills: z.array(z.string()).default([]),
  bio: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email.toLowerCase(),
        passwordHash,
        college: validated.college,
        yearOfStudy: validated.yearOfStudy,
        skills: validated.skills,
        bio: validated.bio || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        yearOfStudy: true,
        skills: true,
        bio: true,
        avatarUrl: true,
        resumeUrl: true,
        resumeName: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, college: user.college },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
      return;
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, college: user.college },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...userSafe } = user;
    res.json({ user: userSafe, token });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        yearOfStudy: true,
        skills: true,
        bio: true,
        avatarUrl: true,
        resumeUrl: true,
        resumeName: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { skills, college, yearOfStudy, bio, name } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(skills && { skills }),
        ...(college && { college }),
        ...(yearOfStudy && { yearOfStudy: Number(yearOfStudy) }),
        ...(bio !== undefined && { bio }),
        ...(name && { name }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        yearOfStudy: true,
        skills: true,
        bio: true,
        avatarUrl: true,
        resumeUrl: true,
        resumeName: true,
      },
    });

    res.json({ user: updated });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        yearOfStudy: true,
        skills: true,
        bio: true,
        avatarUrl: true,
        resumeUrl: true,
        resumeName: true,
      },
    });
    res.json({ users });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const uploadResume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded or invalid file format' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { resumeUrl: true },
    });

    // Delete previous file if exists locally
    if (existingUser?.resumeUrl && existingUser.resumeUrl.startsWith('/uploads/resumes/')) {
      const oldFilename = path.basename(existingUser.resumeUrl);
      const oldPath = path.join(process.cwd(), 'uploads', 'resumes', oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (unlinkErr) {
          console.warn('Could not remove previous resume file:', unlinkErr);
        }
      }
    }

    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    const resumeName = req.file.originalname;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        resumeUrl,
        resumeName,
      },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        yearOfStudy: true,
        skills: true,
        bio: true,
        avatarUrl: true,
        resumeUrl: true,
        resumeName: true,
        createdAt: true,
      },
    });

    res.json({ user: updatedUser, message: 'Resume uploaded successfully' });
  } catch (error: any) {
    console.error('uploadResume error:', error);
    res.status(500).json({ message: error.message || 'Failed to upload resume' });
  }
};

export const deleteResume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { resumeUrl: true },
    });

    if (existingUser?.resumeUrl && existingUser.resumeUrl.startsWith('/uploads/resumes/')) {
      const filename = path.basename(existingUser.resumeUrl);
      const filePath = path.join(process.cwd(), 'uploads', 'resumes', filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.warn('Could not remove resume file:', unlinkErr);
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        resumeUrl: null,
        resumeName: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        yearOfStudy: true,
        skills: true,
        bio: true,
        avatarUrl: true,
        resumeUrl: true,
        resumeName: true,
        createdAt: true,
      },
    });

    res.json({ user: updatedUser, message: 'Resume removed successfully' });
  } catch (error: any) {
    console.error('deleteResume error:', error);
    res.status(500).json({ message: 'Failed to remove resume' });
  }
};

