export const db = {} as any;
export const auth = {} as any;
export const storage = {} as any;

export const COLLECTIONS = {
  ANNOUNCEMENTS: 'announcements',
  JOBS: 'jobs',
  NOTIFICATIONS: 'notifications',
  ADMINS: 'admins',
} as const;

export interface Announcement {
  id?: string;
  title: string;
  description: string;
  category: 'vanzare' | 'cumparare' | 'schimb' | 'diverse';
  price?: number;
  images?: string[];
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  rejectionReason?: string;
}

export interface Job {
  id?: string;
  title: string;
  company: string;
  description: string;
  requirements?: string[];
  benefits?: string[];
  salary?: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  contact: {
    email: string;
    phone?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  validUntil?: Date;
  rejectionReason?: string;
}

export interface NotificationLog {
  id?: string;
  title: string;
  message: string;
  url?: string;
  sentAt: Date;
  sentBy: string;
  recipients: number;
  type: 'announcement' | 'job' | 'general' | 'emergency';
}