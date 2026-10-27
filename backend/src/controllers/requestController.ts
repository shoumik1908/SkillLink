import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

const requestSchema = z.object({
  listingId: z.string().min(1, 'listingId is required'),
  message: z.string().optional(),
});

const respondSchema = z.object({
  status: z.enum(['approved', 'denied']),
});

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { listingId, message } = requestSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        members: true,
        owner: { select: { id: true, name: true } },
      },
    });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    if (listing.ownerId === req.user.id) {
      res.status(400).json({ message: 'You cannot request to join your own listing' });
      return;
    }

    const isMember = listing.members.some((m) => m.userId === req.user!.id);
    if (isMember) {
      res.status(400).json({ message: 'You are already a member of this team' });
      return;
    }

    if (listing.members.length >= listing.intendedTeamSize) {
      res.status(400).json({ message: 'This team is already at full capacity' });
      return;
    }

    const existingRequest = await prisma.joinRequest.findUnique({
      where: {
        listingId_studentId: {
          listingId,
          studentId: req.user.id,
        },
      },
    });

    if (existingRequest) {
      res.status(400).json({ message: 'You have already submitted a request for this listing' });
      return;
    }

    const newRequest = await prisma.joinRequest.create({
      data: {
        listingId,
        studentId: req.user.id,
        message: message || null,
        status: 'pending',
      },
      include: {
        listing: { select: { title: true } },
        student: { select: { id: true, name: true, email: true, skills: true } },
      },
    });

    // Notify listing owner
    await prisma.notification.create({
      data: {
        userId: listing.ownerId,
        message: `${req.user.name} requested to join your listing: "${listing.title}"`,
      },
    });

    res.status(201).json({ request: newRequest });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
      return;
    }
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Failed to submit join request' });
  }
};

export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Requests submitted by current user
    const outgoing = await prisma.joinRequest.findMany({
      where: { studentId: req.user.id },
      include: {
        listing: {
          select: { id: true, title: true, type: true, college: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Requests sent to listings owned by current user
    const incoming = await prisma.joinRequest.findMany({
      where: {
        listing: { ownerId: req.user.id },
      },
      include: {
        listing: { select: { id: true, title: true, type: true } },
        student: { select: { id: true, name: true, email: true, college: true, skills: true, yearOfStudy: true, resumeUrl: true, resumeName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // All relevant requests in frontend format
    const allRequests = await prisma.joinRequest.findMany({
      where: {
        OR: [
          { studentId: req.user.id },
          { listing: { ownerId: req.user.id } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      requests: allRequests,
      incoming,
      outgoing,
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Failed to fetch join requests' });
  }
};

export const respondToRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    const { status } = respondSchema.parse(req.body);

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id },
      include: {
        listing: {
          include: { members: true },
        },
      },
    });

    if (!joinRequest) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (joinRequest.listing.ownerId !== req.user.id) {
      res.status(403).json({ message: 'Only the listing owner can respond to this request' });
      return;
    }

    const updatedRequest = await prisma.joinRequest.update({
      where: { id },
      data: { status },
    });

    if (status === 'approved') {
      // Add student as member if not already added
      const alreadyMember = joinRequest.listing.members.some((m) => m.userId === joinRequest.studentId);
      if (!alreadyMember) {
        await prisma.listingMember.create({
          data: {
            listingId: joinRequest.listingId,
            userId: joinRequest.studentId,
          },
        });
      }

      // Check if team is full now
      const currentMemberCount = joinRequest.listing.members.length + 1;
      if (currentMemberCount >= joinRequest.listing.intendedTeamSize) {
        await prisma.listing.update({
          where: { id: joinRequest.listingId },
          data: { status: 'FILLED' },
        });
      }

      // Notify the applicant
      await prisma.notification.create({
        data: {
          userId: joinRequest.studentId,
          message: `Your request to join "${joinRequest.listing.title}" was approved!`,
        },
      });
    } else {
      // Notify the applicant of denial
      await prisma.notification.create({
        data: {
          userId: joinRequest.studentId,
          message: `Your request to join "${joinRequest.listing.title}" was declined.`,
        },
      });
    }

    res.json({ request: updatedRequest });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
      return;
    }
    console.error('Respond to request error:', error);
    res.status(500).json({ message: 'Failed to process request response' });
  }
};
