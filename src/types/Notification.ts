import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'follow' | 'unfollow';
  actorId: string;
  actorName: string;
  read: boolean;
  createdAt: Date | Timestamp;
} 