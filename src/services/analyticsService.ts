import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  increment, 
  Timestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PostAnalytics, UserAnalytics, DailyAnalytics, AnalyticsEvent } from '../types/Analytics';

// Collection names
const COLLECTIONS = {
  POST_ANALYTICS: 'postAnalytics',
  USER_ANALYTICS: 'userAnalytics',
  DAILY_ANALYTICS: 'dailyAnalytics',
  ANALYTICS_EVENTS: 'analyticsEvents'
} as const;

// Post Analytics
export const getPostAnalytics = async (postId: string): Promise<PostAnalytics | null> => {
  const docRef = doc(db, COLLECTIONS.POST_ANALYTICS, postId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as PostAnalytics : null;
};

export const updatePostAnalytics = async (
  postId: string, 
  event: AnalyticsEvent
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.POST_ANALYTICS, postId);
  const docSnap = await getDoc(docRef);
  
  const updates: Partial<PostAnalytics> = {
    postId,
    updatedAt: Timestamp.now()
  };

  if (!docSnap.exists()) {
    // Create initial document if it doesn't exist
    updates.createdAt = Timestamp.now();
    updates.likes = 0;
    updates.comments = 0;
    updates.views = 0;
    updates.averageTimeSpent = 0;
  }

  switch (event.type) {
    case 'post_like':
      updates.likes = increment(1);
      break;
    case 'post_unlike':
      updates.likes = increment(-1);
      break;
    case 'comment_create':
      updates.comments = increment(1);
      break;
    case 'post_view':
      updates.views = increment(1);
      if (event.metadata?.timeSpent) {
        updates.averageTimeSpent = increment(event.metadata.timeSpent);
      }
      break;
  }

  await setDoc(docRef, updates, { merge: true });
};

// User Analytics
export const getUserAnalytics = async (userId: string): Promise<UserAnalytics | null> => {
  const docRef = doc(db, COLLECTIONS.USER_ANALYTICS, userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as UserAnalytics : null;
};

export const updateUserAnalytics = async (
  userId: string,
  event: AnalyticsEvent
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.USER_ANALYTICS, userId);
  const docSnap = await getDoc(docRef);
  
  const updates: Partial<UserAnalytics> = {
    userId,
    lastActive: Timestamp.now()
  };

  if (!docSnap.exists()) {
    // Create initial document if it doesn't exist
    updates.postsCreated = 0;
    updates.commentsCreated = 0;
    updates.likesGiven = 0;
    updates.totalEngagement = 0;
  }

  updates.totalEngagement = increment(1);

  switch (event.type) {
    case 'post_like':
    case 'comment_like':
      updates.likesGiven = increment(1);
      break;
    case 'post_unlike':
    case 'comment_unlike':
      updates.likesGiven = increment(-1);
      break;
    case 'comment_create':
      updates.commentsCreated = increment(1);
      break;
  }

  await setDoc(docRef, updates, { merge: true });
};

// Daily Analytics
export const getDailyAnalytics = async (date: string): Promise<DailyAnalytics | null> => {
  const docRef = doc(db, COLLECTIONS.DAILY_ANALYTICS, date);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as DailyAnalytics : null;
};

export const updateDailyAnalytics = async (
  date: string,
  event: AnalyticsEvent
): Promise<void> => {
  const docRef = doc(db, COLLECTIONS.DAILY_ANALYTICS, date);
  const docSnap = await getDoc(docRef);
  
  const updates: Partial<DailyAnalytics> = {
    date
  };

  if (!docSnap.exists()) {
    // Create initial document if it doesn't exist
    updates.activeUsers = 0;
    updates.newPosts = 0;
    updates.newComments = 0;
    updates.totalLikes = 0;
    updates.totalViews = 0;
  }

  switch (event.type) {
    case 'post_like':
    case 'comment_like':
      updates.totalLikes = increment(1);
      break;
    case 'post_unlike':
    case 'comment_unlike':
      updates.totalLikes = increment(-1);
      break;
    case 'comment_create':
      updates.newComments = increment(1);
      break;
    case 'post_view':
      updates.totalViews = increment(1);
      break;
  }

  // Update active users count
  const activeUsersQuery = query(
    collection(db, COLLECTIONS.ANALYTICS_EVENTS),
    where('timestamp', '>=', Timestamp.fromDate(new Date(date))),
    where('timestamp', '<', Timestamp.fromDate(new Date(new Date(date).setDate(new Date(date).getDate() + 1))))
  );
  const activeUsersSnapshot = await getDocs(activeUsersQuery);
  const uniqueUsers = new Set(activeUsersSnapshot.docs.map(doc => doc.data().userId));
  updates.activeUsers = uniqueUsers.size;

  await setDoc(docRef, updates, { merge: true });
};

// Analytics Events
export const logAnalyticsEvent = async (event: AnalyticsEvent): Promise<void> => {
  // Create a new document with auto-generated ID
  const collectionRef = collection(db, COLLECTIONS.ANALYTICS_EVENTS);
  const eventDoc = doc(collectionRef);
  
  await setDoc(eventDoc, {
    ...event,
    timestamp: Timestamp.now()
  });

  // Update all relevant analytics
  const today = new Date().toISOString().split('T')[0];
  await Promise.all([
    updatePostAnalytics(event.postId, event),
    updateUserAnalytics(event.userId, event),
    updateDailyAnalytics(today, event)
  ]);
}; 