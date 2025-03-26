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
  const [isUpdating, setIsUpdating] = useState(false);

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

    setIsUpdating(true);
    // Store the previous state for potential rollback
    const wasFollowing = isFollowing;
    // Optimistically update the UI
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await neo4jService.unfollowUser(user.uid, userId);
        toast.success('User unfollowed');

        // Create notification for the unfollowed user
        await addNotification({
          userId,
          type: 'unfollow',
          actorId: user.uid,
          actorName: user.displayName || 'Anonymous'
        });
      } else {
        await neo4jService.followUser(user.uid, userId);
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
      // Revert optimistic update on error
      setIsFollowing(wasFollowing);
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user || user.uid === userId) {
    return null;
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading || isUpdating}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? 'Loading...' : isUpdating ? (isFollowing ? 'Unfollowing...' : 'Following...') : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
} 