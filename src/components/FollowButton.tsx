import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { neo4jService } from '../services/neo4j';
import toast from 'react-hot-toast';

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export const FollowButton = ({ userId, className = '' }: FollowButtonProps) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (!user || !userId) return;
      try {
        const following = await neo4jService.isFollowing(user.uid, userId);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowingStatus();
  }, [user, userId]);

  const handleClick = async () => {
    if (!user || !userId) return;
    
    setIsLoading(true);
    try {
      if (isFollowing) {
        await neo4jService.unfollowUser(user.uid, userId);
        setIsFollowing(false);
        toast.success('Unfollowed successfully');
      } else {
        await neo4jService.followUser(user.uid, userId);
        setIsFollowing(true);
        toast.success('Followed successfully');
      }
    } catch (error) {
      console.error('Error following/unfollowing:', error);
      toast.error('Failed to update follow status');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.uid === userId) return null;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } ${className}`}
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Unfollow' : 'Follow'}
    </button>
  );
}; 