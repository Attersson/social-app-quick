import { ActivityWithUserData } from '../types/Activity';

interface AggregatedActivity extends ActivityWithUserData {
  count: number;
  users: {
    id: string;
    displayName: string;
  }[];
  originalActivities: ActivityWithUserData[];
}

const AGGREGATION_TIME_WINDOW = 1000 * 60 * 60; // 1 hour in milliseconds

const shouldAggregateActivities = (a1: ActivityWithUserData, a2: ActivityWithUserData): boolean => {
  const timeDiff = Math.abs(a1.createdAt.toMillis() - a2.createdAt.toMillis());
  
  // Basic rules for aggregation:
  // 1. Same activity type
  // 2. Within time window
  // 3. Same target (post or user)
  const sameType = a1.type === a2.type;
  const withinTimeWindow = timeDiff <= AGGREGATION_TIME_WINDOW;
  
  // Check if both activities have postId and they match
  const samePost = typeof a1.postId === 'string' && 
    typeof a2.postId === 'string' && 
    a1.postId === a2.postId;
    
  // Check if both activities have targetUserId and they match
  const sameUser = typeof a1.targetUserId === 'string' && 
    typeof a2.targetUserId === 'string' && 
    a1.targetUserId === a2.targetUserId;

  const sameTarget = samePost || sameUser;

  return sameType && withinTimeWindow && sameTarget;
};

export const aggregateActivities = (
  activities: ActivityWithUserData[]
): AggregatedActivity[] => {
  if (!activities.length) return [];

  // Sort activities by time first
  const sortedActivities = [...activities].sort(
    (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
  );

  const aggregated: AggregatedActivity[] = [];
  let currentGroup: ActivityWithUserData[] = [sortedActivities[0]];

  // Group activities that should be aggregated
  for (let i = 1; i < sortedActivities.length; i++) {
    const currentActivity = sortedActivities[i];
    const lastActivityInGroup = currentGroup[0];

    if (shouldAggregateActivities(currentActivity, lastActivityInGroup)) {
      currentGroup.push(currentActivity);
    } else {
      // Process the current group
      if (currentGroup.length > 1) {
        const baseActivity = currentGroup[0];
        aggregated.push({
          ...baseActivity,
          count: currentGroup.length,
          users: currentGroup.map(activity => ({
            id: activity.userId,
            displayName: activity.userDisplayName
          })),
          originalActivities: currentGroup
        });
      } else {
        // Single activity, no aggregation needed
        aggregated.push({
          ...currentGroup[0],
          count: 1,
          users: [{
            id: currentGroup[0].userId,
            displayName: currentGroup[0].userDisplayName
          }],
          originalActivities: currentGroup
        });
      }
      currentGroup = [currentActivity];
    }
  }

  // Process the last group
  if (currentGroup.length > 0) {
    if (currentGroup.length > 1) {
      const baseActivity = currentGroup[0];
      aggregated.push({
        ...baseActivity,
        count: currentGroup.length,
        users: currentGroup.map(activity => ({
          id: activity.userId,
          displayName: activity.userDisplayName
        })),
        originalActivities: currentGroup
      });
    } else {
      aggregated.push({
        ...currentGroup[0],
        count: 1,
        users: [{
          id: currentGroup[0].userId,
          displayName: currentGroup[0].userDisplayName
        }],
        originalActivities: currentGroup
      });
    }
  }

  return aggregated;
}; 