import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: 'follow' | 'unfollow' | 'like' | 'unlike';
  actorId: string;
  actorName: string;
  read: boolean;
  createdAt: Date | Timestamp;
  postId?: string;
  postContent?: string;
} 