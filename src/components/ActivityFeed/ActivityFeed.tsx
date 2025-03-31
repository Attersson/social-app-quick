import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getActivitiesForUser, markActivityAsRead } from '../../services/activityService';
import { ActivityWithUserData, ActivityType } from '../../types/Activity';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { BellIcon, HeartIcon, ChatBubbleLeftIcon, UserPlusIcon, UserMinusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const ACTIVITIES_PER_PAGE = 10;

const activityTypeIcons = {
  follow: UserPlusIcon,
  unfollow: UserMinusIcon,
  like: HeartIcon,
  comment: ChatBubbleLeftIcon,
  post: DocumentTextIcon,
};

export const ActivityFeed: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityWithUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const observer = useRef<IntersectionObserver | null>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [hasMore]);

  const lastActivityElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(handleObserver, { root: null, threshold: 0 });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, handleObserver]);

  const fetchActivities = async (pageNum: number, reset: boolean = false) => {
    if (!user) return;
    try {
      setLoading(true);
      const userActivities = await getActivitiesForUser(
        user.uid,
        ACTIVITIES_PER_PAGE,
        pageNum,
        selectedType === 'all' ? undefined : selectedType,
        sortOrder
      );
      setActivities(prev => reset ? userActivities : [...prev, ...userActivities]);
      setHasMore(userActivities.length === ACTIVITIES_PER_PAGE);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchActivities(1, true);
  }, [user, selectedType, sortOrder]);

  useEffect(() => {
    if (page > 1) {
      fetchActivities(page);
    }
  }, [page]);

  const handleActivityClick = async (activityId: string) => {
    try {
      await markActivityAsRead(activityId);
      setActivities(activities.map(activity => 
        activity.id === activityId ? { ...activity, read: true } : activity
      ));
    } catch (error) {
      console.error('Error marking activity as read:', error);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    const Icon = activityTypeIcons[type];
    return <Icon className="h-5 w-5" />;
  };

  const getActivityMessage = (activity: ActivityWithUserData) => {
    switch (activity.type) {
      case 'follow':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('follow')}
            <span>
              <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                {activity.userDisplayName}
              </Link>
              {' followed '}
              <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                {activity.targetUserDisplayName}
              </Link>
            </span>
          </span>
        );
      case 'unfollow':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('unfollow')}
            <span>
              <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                {activity.userDisplayName}
              </Link>
              {' unfollowed '}
              <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                {activity.targetUserDisplayName}
              </Link>
            </span>
          </span>
        );
      case 'like':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('like')}
            <span>
              <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                {activity.userDisplayName}
              </Link>
              {' liked your post'}
            </span>
          </span>
        );
      case 'comment':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('comment')}
            <span>
              <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                {activity.userDisplayName}
              </Link>
              {' commented on your post'}
              {activity.commentContent && (
                <span className="block mt-1 text-sm text-gray-600 italic">
                  "{activity.commentContent.length > 100 
                    ? activity.commentContent.substring(0, 100) + '...' 
                    : activity.commentContent}"
                </span>
              )}
            </span>
          </span>
        );
      case 'post':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('post')}
            <span>
              <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                {activity.targetUserDisplayName}
              </Link>
              {' created a new post'}
              {activity.postContent && (
                <span className="block mt-1 text-sm text-gray-600">
                  "{activity.postContent.length > 100 
                    ? activity.postContent.substring(0, 100) + '...' 
                    : activity.postContent}"
                </span>
              )}
            </span>
          </span>
        );
      default:
        return '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Activity Feed</h2>
        <div className="flex space-x-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ActivityType | 'all')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Activities</option>
            <option value="follow">Follows</option>
            <option value="unfollow">Unfollows</option>
            <option value="like">Likes</option>
            <option value="comment">Comments</option>
            <option value="post">Posts</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {activities.length === 0 && !loading ? (
        <div className="text-center py-8">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">No activities yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              ref={index === activities.length - 1 ? lastActivityElementRef : undefined}
              className={`p-4 rounded-lg shadow-sm transition-all duration-200 ${
                activity.read ? 'bg-white' : 'bg-blue-50'
              } hover:shadow-md border border-gray-100`}
              onClick={() => handleActivityClick(activity.id)}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={activity.userPhotoURL}
                    alt={activity.userDisplayName}
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">
                    {getActivityMessage(activity)}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true })}
                  </p>
                </div>
                {!activity.read && (
                  <div className="flex-shrink-0">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 