export type SkillTag = string;

export interface User {
  id: string;
  name: string;
  email: string;
  college: string;
  yearOfStudy: number;
  skills: SkillTag[];
}

export type ListingType = 'Project' | 'Hackathon Team' | 'Competition';

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  type: ListingType;
  requiredSkills: SkillTag[];
  intendedTeamSize: number;
  currentTeamIds: string[];
  college: string;
  deadline?: string;
}

export interface Match {
  listingId: string;
  score: number; // 0 to 1, representing proportion of required skills met
  overlappingSkills: SkillTag[];
}

export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface JoinRequest {
  id: string;
  listingId: string;
  studentId: string;
  status: RequestStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}
