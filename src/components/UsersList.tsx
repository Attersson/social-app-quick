import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import { FollowButton } from './FollowButton';
import { neo4jService } from '../services/neo4j';

interface User {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  bio: string | null;
  followersCount: number;
}

export const UsersList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('displayName'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const usersData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          const followersCount = await neo4jService.getFollowersCount(doc.id);
          return {
            id: doc.id,
            displayName: data.displayName || null,
            email: data.email || null,
            photoURL: data.photoURL || null,
            bio: data.bio || null,
            followersCount
          };
        })
      );
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((userData) => (
        <Link
          key={userData.id}
          to={`/users/${userData.id}`}
          className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-4 hover:shadow-lg transition-shadow"
        >
          <img
            src={userData.photoURL || 'https://i.pravatar.cc/150?img=4'}
            alt={userData.displayName || 'User'}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">
              {userData.displayName || userData.email?.split('@')[0] || 'Anonymous'}
            </h3>
            <p className="text-sm text-gray-500">
              {userData.bio || 'No bio yet'}
            </p>
            <p className="text-xs text-gray-400">
              {userData.followersCount} followers
            </p>
          </div>
          <div onClick={(e) => e.preventDefault()}>
            <FollowButton userId={userData.id} />
          </div>
        </Link>
      ))}
    </div>
  );
}; 