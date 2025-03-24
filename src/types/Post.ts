import { Timestamp } from 'firebase/firestore';

export interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Date | Timestamp;
  likes: string[]; // Array of user IDs who liked the post
  comments: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  createdAt: Date | Timestamp;
} 