import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Post as PostType, Comment } from '../types/Post';
import PostCard from './PostCard';

interface FirestoreComment extends Omit<Comment, 'createdAt'> {
  createdAt: Timestamp;
}

interface FirestorePost extends Omit<PostType, 'createdAt' | 'comments'> {
  createdAt: Timestamp;
  comments: FirestoreComment[];
}

interface UserPostsProps {
  userId: string;
}

export default function UserPosts({ userId }: UserPostsProps) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => {
        const data = doc.data() as FirestorePost;
        return {
          id: doc.id,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          authorPhotoURL: data.authorPhotoURL,
          likes: data.likes,
          createdAt: data.createdAt?.toDate() || new Date(),
          comments: data.comments?.map(comment => ({
            ...comment,
            createdAt: comment.createdAt?.toDate() || new Date()
          })) || []
        };
      });
      
      setPosts(newPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handlePostUpdate = () => {
    // The posts will automatically update through the onSnapshot listener
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-600">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
      ))}
    </div>
  );
} 