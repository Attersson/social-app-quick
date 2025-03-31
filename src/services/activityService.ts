import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  startAfter,
  onSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Activity, ActivityType, ActivityWithUserData } from '../types/Activity';
import { getUserData } from '../services/userService';

const ACTIVITIES_COLLECTION = 'activities';

interface UserData {
  displayName: string;
  photoURL: string;
}

interface PostData {
  content: string;
}

interface CommentData {
  content: string;
}

export const createActivity = async (
  type: ActivityType,
  userId: string,
  data: {
    targetUserId?: string;
    postId?: string;
    commentId?: string;
  }
): Promise<void> => {
  const activity: Omit<Activity, 'id'> = {
    type,
    userId,
    createdAt: Timestamp.now(),
    read: false
  };

  // Only add optional fields if they are provided and not undefined
  if (data.targetUserId) {
    activity.targetUserId = data.targetUserId;
  }
  if (data.postId) {
    activity.postId = data.postId;
  }
  if (data.commentId) {
    activity.commentId = data.commentId;
  }

  await addDoc(collection(db, ACTIVITIES_COLLECTION), activity);
};

export const getActivitiesForUser = async (
  userId: string,
  pageSize: number = 10,
  page: number = 1,
  type?: ActivityType,
  sortOrder: 'desc' | 'asc' = 'desc'
): Promise<ActivityWithUserData[]> => {
  let activitiesQuery = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('userId', '==', userId)
  );

  // Add type filter if specified
  if (type) {
    activitiesQuery = query(
      activitiesQuery,
      where('type', '==', type)
    );
  }

  // Add sorting
  activitiesQuery = query(
    activitiesQuery,
    orderBy('createdAt', sortOrder)
  );

  // If not the first page, get the last document from the previous page
  if (page > 1) {
    const prevPageQuery = query(activitiesQuery, limit((page - 1) * pageSize));
    const prevPageDocs = await getDocs(prevPageQuery);
    const lastDoc = prevPageDocs.docs[prevPageDocs.docs.length - 1];
    
    if (lastDoc) {
      activitiesQuery = query(activitiesQuery, startAfter(lastDoc));
    }
  }

  // Add final limit
  activitiesQuery = query(activitiesQuery, limit(pageSize));

  const snapshot = await getDocs(activitiesQuery);
  const activities: ActivityWithUserData[] = [];

  for (const docSnapshot of snapshot.docs) {
    const activity = docSnapshot.data() as Activity;
    const userDoc = await getDoc(doc(db, 'users', activity.userId));
    const userData = userDoc.data() as UserData;

    if (!userData) continue;

    const activityWithUserData: ActivityWithUserData = {
      ...activity,
      id: docSnapshot.id,
      userDisplayName: userData.displayName,
      userPhotoURL: userData.photoURL
    };

    if (activity.targetUserId) {
      const targetUserDoc = await getDoc(doc(db, 'users', activity.targetUserId));
      const targetUserData = targetUserDoc.data() as UserData;
      if (targetUserData) {
        activityWithUserData.targetUserDisplayName = targetUserData.displayName;
        activityWithUserData.targetUserPhotoURL = targetUserData.photoURL;
      }
    }

    if (activity.postId) {
      const postDoc = await getDoc(doc(db, 'posts', activity.postId));
      const postData = postDoc.data() as PostData;
      if (postData) {
        activityWithUserData.postContent = postData.content;
      }
    }

    if (activity.commentId) {
      const commentDoc = await getDoc(doc(db, 'comments', activity.commentId));
      const commentData = commentDoc.data() as CommentData;
      if (commentData) {
        activityWithUserData.commentContent = commentData.content;
      }
    }

    activities.push(activityWithUserData);
  }

  return activities;
};

export const markActivityAsRead = async (activityId: string): Promise<void> => {
  const activityRef = doc(db, ACTIVITIES_COLLECTION, activityId);
  await updateDoc(activityRef, {
    read: true
  });
};

export const activityService = {
  async getActivities(
    userId: string,
    pageSize: number = 10,
    lastVisible?: DocumentData
  ): Promise<ActivityWithUserData[]> {
    try {
      let q = query(
        collection(db, ACTIVITIES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      const activities = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const activity = doc.data() as Activity;
          const userData = await getUserData(activity.userId);
          return {
            ...activity,
            id: doc.id,
            userDisplayName: userData.displayName,
            userPhotoURL: userData.photoURL
          };
        })
      );

      return activities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  },

  subscribeToNewActivities(
    userId: string,
    onNewActivity: (activity: ActivityWithUserData) => void
  ): () => void {
    const q = query(
      collection(db, ACTIVITIES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    return onSnapshot(q, async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const activity = change.doc.data() as Activity;
          const userData = await getUserData(activity.userId);
          onNewActivity({
            ...activity,
            id: change.doc.id,
            userDisplayName: userData.displayName,
            userPhotoURL: userData.photoURL
          });
        }
      });
    });
  },

  async createActivity(
    type: ActivityType,
    userId: string,
    data: {
      targetUserId?: string;
      postId?: string;
      commentId?: string;
    }
  ): Promise<void> {
    try {
      const activity: Omit<Activity, 'id'> = {
        type,
        userId,
        createdAt: Timestamp.now(),
        read: false,
        ...data
      };

      await addDoc(collection(db, ACTIVITIES_COLLECTION), activity);
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }
}; 