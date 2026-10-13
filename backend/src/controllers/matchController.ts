import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

export const getMatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, college: true, skills: true },
    });

    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Fetch open listings in same college not owned by user
    const listings = await prisma.listing.findMany({
      where: {
        ownerId: { not: currentUser.id },
        college: currentUser.college,
        status: 'OPEN',
      },
      include: {
        owner: { select: { id: true, name: true, college: true } },
        members: { select: { userId: true } },
      },
    });

    const userSkillSet = new Set(currentUser.skills.map((s) => s.toLowerCase()));

    const matches = listings
      .map((listing) => {
        const overlappingSkills = listing.requiredSkills.filter((skill) =>
          userSkillSet.has(skill.toLowerCase())
        );

        const score =
          listing.requiredSkills.length > 0
            ? overlappingSkills.length / listing.requiredSkills.length
            : 0;

        return {
          listingId: listing.id,
          score: Math.round(score * 100) / 100,
          overlappingSkills,
          listing: {
            ...listing,
            currentTeamIds: listing.members.map((m) => m.userId),
          },
        };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);

    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ message: 'Failed to compute matches' });
  }
};
