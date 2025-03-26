import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { FollowButton } from './FollowButton';
import { neo4jService } from '../services/neo4j';
import UserPosts from './UserPosts';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  followersCount: number;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const followersCount = await neo4jService.getFollowersCount(userId);
          setUser({
            id: userDoc.id,
            ...userDoc.data(),
            followersCount
          } as User);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Redirect to own profile if trying to view own profile through /users route
  if (userId === currentUser?.uid) {
    return <Navigate to="/profile" replace />;
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (!user || !userId) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <p className="mt-2 text-gray-600">The user you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={user.photoURL || 'https://i.pravatar.cc/150?img=4'}
              alt={user.displayName}
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">{user.followersCount} followers</p>
            </div>
          </div>
          {currentUser && currentUser.uid !== userId && (
            <FollowButton userId={userId} />
          )}
        </div>
        {user.bio && (
          <div className="mt-4">
            <p className="text-gray-700">{user.bio}</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Posts</h2>
        <UserPosts userId={userId} />
      </div>
    </div>
  );
} 