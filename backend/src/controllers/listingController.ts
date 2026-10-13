import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

const createListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  type: z.enum(['Project', 'Hackathon Team', 'Competition']),
  requiredSkills: z.array(z.string()).min(1, 'Please specify at least 1 required skill'),
  intendedTeamSize: z.number().int().min(2, 'Team size must be at least 2'),
  college: z.string().min(2, 'College is required'),
  deadline: z.string().optional(),
});

export const createListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const validated = createListingSchema.parse(req.body);

    const listing = await prisma.listing.create({
      data: {
        title: validated.title,
        description: validated.description,
        type: validated.type,
        requiredSkills: validated.requiredSkills,
        intendedTeamSize: validated.intendedTeamSize,
        college: validated.college,
        deadline: validated.deadline ? new Date(validated.deadline) : null,
        ownerId: req.user.id,
        members: {
          create: {
            userId: req.user.id,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, college: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, skills: true } },
          },
        },
      },
    });

    res.status(201).json({ listing });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
      return;
    }
    console.error('Create listing error:', error);
    res.status(500).json({ message: 'Failed to create listing' });
  }
};

export const getListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { college, type, search } = req.query;

    const whereClause: any = {};

    if (college && typeof college === 'string') {
      whereClause.college = college;
    }

    if (type && typeof type === 'string') {
      whereClause.type = type;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { requiredSkills: { has: search } },
      ];
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true, college: true },
        },
        members: {
          select: { userId: true },
        },
      },
    });

    // Format listings to match frontend Listing interface: currentTeamIds: string[]
    const formatted = listings.map((l) => ({
      ...l,
      currentTeamIds: l.members.map((m) => m.userId),
    }));

    res.json({ listings: formatted });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
};

export const getListingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, college: true, skills: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, skills: true } },
          },
        },
      },
    });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const formatted = {
      ...listing,
      currentTeamIds: listing.members.map((m) => m.userId),
    };

    res.json({ listing: formatted });
  } catch (error) {
    console.error('Get listing by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch listing' });
  }
};

export const deleteListing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;

    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    if (listing.ownerId !== req.user.id) {
      res.status(403).json({ message: 'You are not authorized to delete this listing' });
      return;
    }

    await prisma.listing.delete({ where: { id } });

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'Failed to delete listing' });
  }
};
