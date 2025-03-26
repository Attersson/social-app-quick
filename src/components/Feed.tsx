import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Post as PostType, Comment } from '../types/Post';
import { neo4jService } from '../services/neo4j';
import PostForm from './PostForm';
import PostCard from './PostCard';
import Breadcrumb from './Breadcrumb';
import FollowRecommendations from './FollowRecommendations';

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
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user) return;
      try {
        // Get all following users by setting a high limit (as integer)
        const followingList = await neo4jService.getFollowing(user.uid, 0, 1000);
        setFollowing(followingList.map(f => f.id));
      } catch (error) {
        console.error('Error fetching following:', error);
      }
    };

    fetchFollowing();
  }, [user]);

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
      
      // Filter posts to only show posts from followed users and the current user
      const filteredPosts = newPosts.filter(post => 
        !user || // If no user is logged in, show all posts
        post.authorId === user.uid || // Show user's own posts
        following.includes(post.authorId) // Show posts from followed users
      );
      
      setPosts(filteredPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, following]);

  const handlePostUpdate = () => {
    // The posts will automatically update through the onSnapshot listener
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Breadcrumb items={[{ label: 'Feed' }]} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {user && <PostForm onPostCreated={handlePostUpdate} />}
          
          <div className="block lg:hidden">
            {user && <FollowRecommendations />}
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} onUpdate={handlePostUpdate} />
              ))}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-600">
                {user 
                  ? "No posts from followed users yet. Follow some users to see their posts!" 
                  : "Sign in to see posts from the community."}
              </p>
            </div>
          )}
        </div>
        
        <div className="hidden lg:block lg:col-span-1">
          {user && <FollowRecommendations />}
        </div>
      </div>
    </div>
  );
} 