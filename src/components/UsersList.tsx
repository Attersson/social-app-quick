import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Link } from 'react-router-dom';
import { FollowButton } from './FollowButton';
import { neo4jService } from '../services/neo4j';
import Breadcrumb from './Breadcrumb';

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: 'Users' }]} />
      
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">All Users</h1>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Link to={`/users/${user.id}`} className="flex items-center space-x-4">
                  <img
                    src={user.photoURL || 'https://i.pravatar.cc/150?img=4'}
                    alt={user.displayName || 'User avatar'}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {user.displayName || 'Anonymous'}
                    </h2>
                    <p className="text-sm text-gray-500">{user.followersCount} followers</p>
                  </div>
                </Link>
                <FollowButton userId={user.id} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 