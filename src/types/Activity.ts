import { Timestamp } from 'firebase/firestore';

export type ActivityType = 'follow' | 'unfollow' | 'like' | 'comment' | 'post';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  targetUserId?: string; // For follow activities
  postId?: string; // For like and comment activities
  commentId?: string; // For comment activities
  createdAt: Timestamp;
  read: boolean;
}

export interface ActivityWithUserData extends Activity {
  userDisplayName: string;
  userPhotoURL: string;
  targetUserDisplayName?: string;
  targetUserPhotoURL?: string;
  postContent?: string;
  commentContent?: string;
} 