import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getActivitiesForUser, markActivityAsRead } from '../../services/activityService';
import { ActivityWithUserData, ActivityType } from '../../types/Activity';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { BellIcon, HeartIcon, ChatBubbleLeftIcon, UserPlusIcon, UserMinusIcon, DocumentTextIcon, ChevronDownIcon, ChevronUpIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { aggregateActivities } from '../../utils/activityAggregation';
import { activityService } from '../../services/activityService';

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
  const [showAggregated, setShowAggregated] = useState(true);
  const [expandedActivities, setExpandedActivities] = useState<string[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasNewActivities, setHasNewActivities] = useState(false);
  const activitiesRef = useRef<ActivityWithUserData[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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

  const toggleActivityExpansion = (activityId: string) => {
    setExpandedActivities(prev =>
      prev.includes(activityId)
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const getActivityMessage = (activity: ActivityWithUserData & { count?: number; users?: { id: string; displayName: string; }[] }) => {
    const isAggregated = activity.count && activity.count > 1;

    switch (activity.type) {
      case 'follow':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('follow')}
            <span>
              {isAggregated ? (
                <>
                  <Link to={`/users/${activity.users![0].id}`} className="font-semibold hover:underline">
                    {activity.users![0].displayName}
                  </Link>
                  {` and ${activity.count! - 1} others followed `}
                  <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                    {activity.targetUserDisplayName}
                  </Link>
                </>
              ) : (
                <>
                  <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                    {activity.userDisplayName}
                  </Link>
                  {' followed '}
                  <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                    {activity.targetUserDisplayName}
                  </Link>
                </>
              )}
            </span>
          </span>
        );
      case 'unfollow':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('unfollow')}
            <span>
              {isAggregated ? (
                <>
                  <Link to={`/users/${activity.users![0].id}`} className="font-semibold hover:underline">
                    {activity.users![0].displayName}
                  </Link>
                  {` and ${activity.count! - 1} others unfollowed `}
                  <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                    {activity.targetUserDisplayName}
                  </Link>
                </>
              ) : (
                <>
                  <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                    {activity.userDisplayName}
                  </Link>
                  {' unfollowed '}
                  <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                    {activity.targetUserDisplayName}
                  </Link>
                </>
              )}
            </span>
          </span>
        );
      case 'like':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('like')}
            <span>
              {isAggregated ? (
                <>
                  <Link to={`/users/${activity.users![0].id}`} className="font-semibold hover:underline">
                    {activity.users![0].displayName}
                  </Link>
                  {` and ${activity.count! - 1} others liked your post`}
                </>
              ) : (
                <>
                  <Link to={`/users/${activity.userId}`} className="font-semibold hover:underline">
                    {activity.userDisplayName}
                  </Link>
                  {' liked your post'}
                </>
              )}
            </span>
          </span>
        );
      case 'comment':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('comment')}
            <span>
              {isAggregated ? (
                <>
                  <Link to={`/users/${activity.users![0].id}`} className="font-semibold hover:underline">
                    {activity.users![0].displayName}
                  </Link>
                  {` and ${activity.count! - 1} others commented on your post`}
                  {activity.commentContent && (
                    <span className="block mt-1 text-sm text-gray-600 italic">
                      Latest: "{activity.commentContent.length > 100 
                        ? activity.commentContent.substring(0, 100) + '...' 
                        : activity.commentContent}"
                    </span>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </span>
          </span>
        );
      case 'post':
        return (
          <span className="flex items-center space-x-2">
            {getActivityIcon('post')}
            <span>
              {isAggregated ? (
                <>
                  <Link to={`/users/${activity.targetUserId}`} className="font-semibold hover:underline">
                    {activity.targetUserDisplayName}
                  </Link>
                  {` created ${activity.count} new posts`}
                </>
              ) : (
                <>
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
                </>
              )}
            </span>
          </span>
        );
      default:
        return '';
    }
  };

  const processedActivities = showAggregated 
    ? aggregateActivities(activities)
    : activities.map(activity => ({
        ...activity,
        count: 1,
        users: [{ id: activity.userId, displayName: activity.userDisplayName }],
        originalActivities: [activity]
      }));

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up real-time listener for new activities
  useEffect(() => {
    if (!user) return;

    const setupRealtimeListener = async () => {
      try {
        // Initial load of activities
        const initialActivities = await getActivitiesForUser(user.uid, 10, 1, selectedType === 'all' ? undefined : selectedType, sortOrder);
        setActivities(initialActivities);
        activitiesRef.current = initialActivities;

        // Set up real-time listener for new activities
        unsubscribeRef.current = activityService.subscribeToNewActivities(
          user.uid,
          (newActivity) => {
            setHasNewActivities(true);
            activitiesRef.current = [newActivity, ...activitiesRef.current];
          }
        );
      } catch (err) {
        console.error('Error loading activities:', err);
      } finally {
        setLoading(false);
      }
    };

    setupRealtimeListener();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user, selectedType, sortOrder]);

  // Handle refresh
  const handleRefresh = async () => {
    if (!user) return;
    
    setLoading(true);
    setHasNewActivities(false);
    try {
      const refreshedActivities = await getActivitiesForUser(user.uid, 10, 1, selectedType === 'all' ? undefined : selectedType, sortOrder);
      setActivities(refreshedActivities);
      activitiesRef.current = refreshedActivities;
    } catch (err) {
      console.error('Error refreshing activities:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Activity Feed</h2>
        <div className="flex space-x-4">
          {hasNewActivities && (
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              New Activities
            </button>
          )}
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
          <button
            onClick={() => setShowAggregated(!showAggregated)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showAggregated ? 'Show Detailed' : 'Show Aggregated'}
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are currently offline. Some activities may not be up to date.
              </p>
            </div>
          </div>
        </div>
      )}

      {processedActivities.length === 0 && !loading ? (
        <div className="text-center py-8">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">No activities yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {processedActivities.map((activity, index) => (
            <div
              key={activity.id}
              ref={index === processedActivities.length - 1 ? lastActivityElementRef : undefined}
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
                  {activity.count > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActivityExpansion(activity.id);
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {expandedActivities.includes(activity.id) ? (
                        <>
                          <ChevronUpIcon className="h-4 w-4 mr-1" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="h-4 w-4 mr-1" />
                          Show all {activity.count} activities
                        </>
                      )}
                    </button>
                  )}
                  {expandedActivities.includes(activity.id) && activity.count > 1 && (
                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                      {activity.originalActivities.map((originalActivity) => (
                        <div key={originalActivity.id} className="text-sm text-gray-600">
                          <Link to={`/users/${originalActivity.userId}`} className="font-semibold hover:underline">
                            {originalActivity.userDisplayName}
                          </Link>
                          {' • '}
                          {formatDistanceToNow(originalActivity.createdAt.toDate(), { addSuffix: true })}
                        </div>
                      ))}
                    </div>
                  )}
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