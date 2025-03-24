import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
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
          setUser({
            id: userDoc.id,
            ...userDoc.data()
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

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <p className="mt-2 text-gray-600">The user you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
          <div className="relative">
            <img
              className="h-20 w-20 rounded-full object-cover"
              src="https://i.pravatar.cc/150?img=4"
              alt={user.displayName || 'User avatar'}
            />
          </div>
          
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {user.displayName || 'Anonymous'}
            </h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bio</h3>
          <p className="text-gray-600 whitespace-pre-wrap">
            {user.bio || 'No bio available.'}
          </p>
        </div>
      </div>
    </div>
  );
} 