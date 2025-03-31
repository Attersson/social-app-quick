import { Timestamp, FieldValue } from 'firebase/firestore';

export interface PostAnalytics {
  postId: string;
  likes: number | FieldValue;
  comments: number | FieldValue;
  views: number | FieldValue;
  averageTimeSpent: number | FieldValue;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserAnalytics {
  userId: string;
  postsCreated: number | FieldValue;
  commentsCreated: number | FieldValue;
  likesGiven: number | FieldValue;
  lastActive: Timestamp;
  totalEngagement: number | FieldValue;
}

export interface DailyAnalytics {
  date: string; // Format: YYYY-MM-DD
  activeUsers: number | FieldValue;
  newPosts: number | FieldValue;
  newComments: number | FieldValue;
  totalLikes: number | FieldValue;
  totalViews: number | FieldValue;
}

export interface AnalyticsEvent {
  type: 'post_view' | 'post_like' | 'post_unlike' | 'comment_create' | 'comment_like' | 'comment_unlike';
  userId: string;
  postId: string;
  commentId?: string;
  timestamp: Timestamp;
  metadata?: {
    timeSpent?: number; // in seconds
    deviceType?: string;
    location?: string;
  };
} 