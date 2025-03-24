import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Post as PostType, Comment } from '../types/Post';
import PostForm from './PostForm';
import PostCard from './PostCard';

interface FirestoreComment extends Omit<Comment, 'createdAt'> {
  createdAt: Timestamp;
}

interface FirestorePost extends Omit<PostType, 'createdAt' | 'comments'> {
  createdAt: Timestamp;
  comments: FirestoreComment[];
}

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
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
  }, []);

  const handlePostUpdate = () => {
    // The posts will automatically update through the onSnapshot listener
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {user && <PostForm onPostCreated={handlePostUpdate} />}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading posts...</p>
        </div>
      ) : posts.length > 0 ? (
        posts.map(post => (
          <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
        ))
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600">
            {user ? "No posts yet. Be the first to post!" : "Sign in to see posts from the community."}
          </p>
        </div>
      )}
    </div>
  );
} 