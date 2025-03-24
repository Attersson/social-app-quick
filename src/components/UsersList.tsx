import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  bio?: string;
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          displayName: data.displayName || null,
          email: data.email || null,
          photoURL: data.photoURL || null,
          bio: data.bio || ''
        };
      });
      
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getUserDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Anonymous User';
  };

  const getAvatarUrl = () => {
    return 'https://i.pravatar.cc/150?img=4';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {users.map(user => {
          const displayName = getUserDisplayName(user);
          return (
            <Link
              key={user.id}
              to={user.id === currentUser?.uid ? '/profile' : `/users/${user.id}`}
              className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={getAvatarUrl()}
                  alt={`${displayName}'s avatar`}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {displayName}
                    {user.id === currentUser?.uid && ' (You)'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {user.bio || 'No bio yet'}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 