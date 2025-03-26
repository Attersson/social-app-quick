import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { neo4jService } from '../services/neo4j';
import { useNotifications } from '../contexts/NotificationsContext';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export function FollowButton({ userId, className = '' }: FollowButtonProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const following = await neo4jService.isFollowing(user.uid, userId);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowStatus();
  }, [user, userId]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        await neo4jService.unfollowUser(user.uid, userId);
        setIsFollowing(false);
        toast.success('User unfollowed');
      } else {
        await neo4jService.followUser(user.uid, userId);
        setIsFollowing(true);
        toast.success('User followed');

        // Create notification for the followed user
        await addNotification({
          userId,
          type: 'follow',
          actorId: user.uid,
          actorName: user.displayName || 'Anonymous'
        });
      }
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.uid === userId) {
    return null;
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
} 