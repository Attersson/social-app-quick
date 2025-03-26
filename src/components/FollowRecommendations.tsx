import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { neo4jService } from '../services/neo4j';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FollowButton } from './FollowButton';
import { Link } from 'react-router-dom';

interface RecommendedUser {
  id: string;
  displayName: string;
  reason: string;
}

interface FirestoreUser {
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
}

export default function FollowRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get users followed by users I follow (friends of friends)
        const friendsOfFriends = await neo4jService.getFriendsOfFriends(user.uid);
        
        // Get users who follow me but I don't follow back
        const followers = await neo4jService.getFollowers(user.uid, 0, 10);
        const following = await neo4jService.getFollowing(user.uid, 0, 10);
        const followingIds = following.map(f => f.id);
        const notFollowedBack = followers.filter(f => !followingIds.includes(f.id));

        // Get all users from Firestore
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const allUsers = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...(doc.data() as FirestoreUser) }))
          .filter(u => u.id !== user.uid && !followingIds.includes(u.id));

        // Shuffle the users array
        const shuffledUsers = allUsers.sort(() => Math.random() - 0.5);
        
        // Combine and deduplicate recommendations
        const recommendations: RecommendedUser[] = [];
        const addedUsers = new Set<string>();

        // Helper function to add user if not already added
        const addUserWithReason = (userId: string, displayName: string, reason: string) => {
          if (recommendations.length >= 3 || addedUsers.has(userId) || userId === user.uid) {
            return;
          }
          recommendations.push({ id: userId, displayName, reason });
          addedUsers.add(userId);
        };

        // Add recommendations in priority order
        for (const friend of friendsOfFriends) {
          const userDoc = await getDoc(doc(db, 'users', friend.id));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            addUserWithReason(
              friend.id,
              userData.displayName,
              `Followed by ${friend.mutualFriends} people you follow`
            );
          }
        }

        for (const follower of notFollowedBack) {
          addUserWithReason(
            follower.id,
            follower.displayName,
            'Follows you'
          );
        }

        // Add random users from the shuffled list
        for (const randomUser of shuffledUsers) {
          addUserWithReason(
            randomUser.id,
            randomUser.displayName,
            'You might be interested'
          );
        }

        setRecommendations(recommendations);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggested for you</h2>
      
      {loading ? (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((recommendation) => (
            <div key={recommendation.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link to={`/users/${recommendation.id}`} className="flex-shrink-0">
                  <img
                    src="https://i.pravatar.cc/150?img=4"
                    alt={recommendation.displayName}
                    className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"
                  />
                </Link>
                <div>
                  <Link 
                    to={`/users/${recommendation.id}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {recommendation.displayName}
                  </Link>
                  <p className="text-sm text-gray-500">{recommendation.reason}</p>
                </div>
              </div>
              <FollowButton userId={recommendation.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No recommendations available at the moment.</p>
      )}
    </div>
  );
} 