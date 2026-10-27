import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Listing, JoinRequest, Notification, Match } from '../types';
import { api, setAuthToken } from '../services/api';
import { useAuth } from './AuthContext';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  listings: Listing[];
  addListing: (listing: Omit<Listing, 'id' | 'ownerId' | 'currentTeamIds'>) => Promise<void>;
  requests: JoinRequest[];
  sendRequest: (listingId: string) => Promise<void>;
  respondToRequest: (requestId: string, status: 'approved' | 'denied') => Promise<void>;
  notifications: Notification[];
  markNotificationRead: (id: string) => Promise<void>;
  matches: Match[];
  updateProfile: (data: Partial<User>) => Promise<User | void>;
  uploadResume: (file: File) => Promise<User>;
  deleteResume: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const fallbackUsers: User[] = [
  { id: 'u1', name: 'Shoumik Kumar', email: 'shoumik1908@gmail.com', role: 'user', college: 'State University', yearOfStudy: 3, skills: ['React', 'UI/UX', 'Tailwind'] },
  { id: 'u2', name: 'Bob Jones', email: 'bob@uni.edu', role: 'user', college: 'State University', yearOfStudy: 2, skills: ['Python', 'Machine Learning'] },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@uni.edu', role: 'user', college: 'State University', yearOfStudy: 4, skills: ['Node.js', 'PostgreSQL', 'React'] },
];

const fallbackListings: Listing[] = [
  {
    id: 'l1',
    ownerId: 'u2',
    title: 'AI Image Generator Hackathon',
    description: 'Looking for a frontend dev to build the UI for our AI image generation tool for the upcoming Spring Hackathon.',
    type: 'Hackathon Team',
    requiredSkills: ['React', 'Tailwind', 'UI/UX'],
    intendedTeamSize: 4,
    currentTeamIds: ['u2'],
    college: 'State University',
  },
  {
    id: 'l2',
    ownerId: 'u3',
    title: 'Campus Marketplace App',
    description: 'Building a marketplace for students to buy/sell textbooks. Need help with the frontend.',
    type: 'Project',
    requiredSkills: ['React', 'Node.js'],
    intendedTeamSize: 3,
    currentTeamIds: ['u3'],
    college: 'State University',
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(fallbackUsers);
  const [listings, setListings] = useState<Listing[]>(fallbackListings);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  // Synchronize currentUser from AuthContext
  useEffect(() => {
    if (authUser) {
      setCurrentUser(prev => ({
        ...prev,
        ...authUser,
        college: authUser.college || prev?.college || 'State University',
        yearOfStudy: authUser.yearOfStudy || prev?.yearOfStudy || 1,
        skills: Array.isArray(authUser.skills) ? authUser.skills : (prev?.skills || []),
      }));
    } else {
      setCurrentUser(null);
    }
  }, [authUser]);

  // Normalize listing fields from backend or cache
  const formatListing = (listing: any): Listing => ({
    ...listing,
    requiredSkills: Array.isArray(listing.requiredSkills) ? listing.requiredSkills : [],
    currentTeamIds: Array.isArray(listing.currentTeamIds)
      ? listing.currentTeamIds
      : [listing.ownerId].filter(Boolean),
  });

  // Fetch initial public data (users & listings)
  const loadPublicData = useCallback(async () => {
    try {
      const [usersRes, listingsRes] = await Promise.all([
        api.getUsers().catch(() => null),
        api.getListings().catch(() => null),
      ]);

      if (usersRes && usersRes.users?.length > 0) {
        setUsers(usersRes.users);
      }

      if (listingsRes && listingsRes.listings) {
        setListings(listingsRes.listings.map(formatListing));
      }
    } catch (err) {
      console.warn('Backend not yet reachable, using cached/fallback data', err);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  const computeLocalMatches = useCallback((user: User, currentListings: Listing[]) => {
    const userSkills = Array.isArray(user.skills) ? user.skills : [];
    const newMatches: Match[] = currentListings
      .filter(l => l.ownerId !== user.id && l.college === user.college)
      .map(listing => {
        const reqSkills = Array.isArray(listing.requiredSkills) ? listing.requiredSkills : [];
        const overlappingSkills = reqSkills.filter(skill => userSkills.includes(skill));
        const score = reqSkills.length > 0 ? overlappingSkills.length / reqSkills.length : 0;
        return { listingId: listing.id, score, overlappingSkills };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    setMatches(newMatches);
  }, []);

  // When currentUser changes, fetch personalized data
  const loadUserData = useCallback(async () => {
    if (!currentUser) {
      setRequests([]);
      setNotifications([]);
      setMatches([]);
      setAuthToken(null);
      return;
    }

    try {
      // Fetch user-specific requests, notifications, and matches
      const [reqRes, notifRes, matchRes] = await Promise.all([
        api.getRequests().catch(() => null),
        api.getNotifications().catch(() => null),
        api.getMatches().catch(() => null),
      ]);

      if (reqRes?.requests) {
        setRequests(reqRes.requests);
      }

      if (notifRes?.notifications) {
        setNotifications(notifRes.notifications);
      }

      if (matchRes?.matches) {
        setMatches(matchRes.matches);
      } else {
        // Fallback local match computation
        computeLocalMatches(currentUser, listings);
      }
    } catch (err) {
      console.warn('Failed to load user-specific data from backend:', err);
      computeLocalMatches(currentUser, listings);
    }
  }, [currentUser, listings, computeLocalMatches]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const addListing = async (listingData: Omit<Listing, 'id' | 'ownerId' | 'currentTeamIds'>) => {
    if (!currentUser) return;
    try {
      const res = await api.createListing(listingData);
      if (res?.listing) {
        setListings(prev => [formatListing(res.listing), ...prev]);
        return;
      }
    } catch (err) {
      console.error('API createListing error, falling back locally:', err);
    }

    // Local fallback
    const newListing: Listing = {
      ...listingData,
      id: `l${Date.now()}`,
      ownerId: currentUser.id,
      currentTeamIds: [currentUser.id],
    };
    setListings(prev => [newListing, ...prev]);
  };

  const sendRequest = async (listingId: string) => {
    if (!currentUser) return;
    if (requests.some(r => r.listingId === listingId && r.studentId === currentUser.id)) return;

    try {
      const res = await api.createRequest(listingId);
      if (res?.request) {
        setRequests(prev => [res.request, ...prev]);
        return;
      }
    } catch (err) {
      console.error('API createRequest error, falling back locally:', err);
    }

    // Local fallback
    const newRequest: JoinRequest = {
      id: `r${Date.now()}`,
      listingId,
      studentId: currentUser.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => [...prev, newRequest]);
  };

  const respondToRequest = async (requestId: string, status: 'approved' | 'denied') => {
    try {
      await api.respondToRequest(requestId, status);
      // Refresh listings and requests from server
      const [listingsRes, requestsRes] = await Promise.all([
        api.getListings().catch(() => null),
        api.getRequests().catch(() => null),
      ]);
      if (listingsRes?.listings) setListings(listingsRes.listings);
      if (requestsRes?.requests) setRequests(requestsRes.requests);
      return;
    } catch (err) {
      console.error('API respondToRequest error, falling back locally:', err);
    }

    // Local fallback
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
    const request = requests.find(r => r.id === requestId);
    if (request && status === 'approved') {
      setListings(prev => prev.map(l => {
        if (l.id === request.listingId) {
          return { ...l, currentTeamIds: [...l.currentTeamIds, request.studentId] };
        }
        return l;
      }));
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id).catch(() => null);
    } catch {
      // Ignored
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;

    // Deduplicate skills: no skill should be re-added if already present
    if (data.skills && Array.isArray(data.skills)) {
      const seen = new Set<string>();
      const uniqueSkills: string[] = [];
      for (const s of data.skills) {
        if (typeof s === 'string') {
          const trimmed = s.trim();
          const lower = trimmed.toLowerCase();
          if (trimmed && !seen.has(lower)) {
            seen.add(lower);
            uniqueSkills.push(trimmed);
          }
        }
      }
      data.skills = uniqueSkills;
    }

    try {
      const res = await api.updateProfile(data);
      if (res?.user) {
        setCurrentUser(res.user);
        setUsers(prev => prev.map(u => u.id === res.user.id ? res.user : u));
        return res.user;
      }
    } catch (err) {
      console.error('API updateProfile error, fallback locally:', err);
    }
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    return updated;
  };

  const uploadResume = async (file: File): Promise<User> => {
    if (!currentUser) throw new Error('Not logged in');
    try {
      const res = await api.uploadResume(file);
      if (res?.user) {
        setCurrentUser(res.user);
        setUsers(prev => prev.map(u => u.id === res.user.id ? res.user : u));
        return res.user;
      }
    } catch (err) {
      console.warn('API uploadResume error, using local fallback:', err);
    }

    // Local fallback for offline / mock / cold-start state
    const localUrl = URL.createObjectURL(file);
    const updated: User = {
      ...currentUser,
      resumeUrl: localUrl,
      resumeName: file.name,
    };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    return updated;
  };

  const deleteResume = async () => {
    if (!currentUser) return;
    try {
      await api.deleteResume();
    } catch (err) {
      console.error('API deleteResume error:', err);
    }
    const updated = { ...currentUser, resumeUrl: undefined, resumeName: undefined };
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const refreshData = async () => {
    await Promise.all([loadPublicData(), loadUserData()]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, users, listings, addListing,
      requests, sendRequest, respondToRequest,
      notifications, markNotificationRead, matches,
      updateProfile, uploadResume, deleteResume, refreshData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
