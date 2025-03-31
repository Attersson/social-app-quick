import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

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
    try {
      // Call your Firebase Cloud Function endpoint
      const response = await fetch('/api/sendPushNotification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          notification: {
            title,
            body,
            data
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }
    } catch (error: unknown) {
      console.error('Error sending push notification:', error);
      throw error;
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