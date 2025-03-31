import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../config/firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
// Flag to enable/disable push notifications via Cloud Functions
const ENABLE_CLOUD_FUNCTIONS = false; // Set to false since we're on the free plan

export const pushNotificationService = {
  async requestPermission(userId: string) {
    try {
      const messaging = getMessaging();
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Get the token
        const token = await getToken(messaging, { vapidKey });
        
        if (token) {
          // Save the token to the user's document
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmToken: token
          });
          return token;
        }
      }
      
      throw new Error('Failed to get push notification permission');
    } catch (error: unknown) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  },

  async sendPushNotification({
    userId,
    title,
    body,
    data
  }: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    // If Cloud Functions are disabled, just log the notification and return
    if (!ENABLE_CLOUD_FUNCTIONS) {
      console.log('Push notification would be sent (Cloud Functions disabled):', {
        userId,
        title,
        body,
        data
      });
      // Return a resolved promise to prevent errors
      return Promise.resolve();
    }
    
    try {
      const functions = getFunctions();
      const sendNotification = httpsCallable(functions, 'sendPushNotification');
      
      await sendNotification({
        userId,
        notification: {
          title,
          body,
          data
        }
      });
    } catch (error: unknown) {
      console.error('Error sending push notification:', error);
      // Don't throw the error, just log it - this prevents breaking the UI flow
      console.log('Continuing without push notification due to error');
    }
  },

  // Helper function to format notification content
  getNotificationContent(type: string, actorName: string, content?: string): { title: string; body: string } {
    switch (type) {
      case 'follow':
        return {
          title: 'New Follower',
          body: `${actorName} started following you`
        };
      case 'like':
        return {
          title: 'New Like',
          body: content 
            ? `${actorName} liked your post: "${content}"`
            : `${actorName} liked your post`
        };
      case 'comment':
        return {
          title: 'New Comment',
          body: `${actorName} commented on your post`
        };
      default:
        return {
          title: 'New Notification',
          body: 'You have a new notification'
        };
    }
  }
}; 