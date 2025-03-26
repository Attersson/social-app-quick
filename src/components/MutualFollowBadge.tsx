import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { neo4jService } from '../services/neo4j';

interface MutualFollowBadgeProps {
  userId: string;
  className?: string;
}

export default function MutualFollowBadge({ userId, className = '' }: MutualFollowBadgeProps) {
  const { user } = useAuth();
  const [isMutual, setIsMutual] = useState(false);

  useEffect(() => {
    const checkMutualFollow = async () => {
      if (!user) return;
      
      try {
        const mutual = await neo4jService.isMutualFollow(user.uid, userId);
        setIsMutual(mutual);
      } catch (error) {
        console.error('Error checking mutual follow:', error);
      }
    };

    checkMutualFollow();
  }, [user, userId]);

  if (!user || user.uid === userId || !isMutual) {
    return null;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
      Mutual
    </span>
  );
} 