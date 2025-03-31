import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { Notification } from '../types/Notification';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  FirestoreError
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '../config/firebase';
import { pushNotificationService } from '../services/pushNotificationService';
import toast from 'react-hot-toast';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Request push notification permission when user logs in
  useEffect(() => {
    if (user) {
      pushNotificationService.requestPermission(user.uid)
        .catch(error => {
          console.error('Error requesting notification permission:', error);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupNotifications = async () => {
      try {
        // First try to get cached data
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        // Get initial data
        const initialSnapshot = await getDocs(q);
        const initialNotifications = initialSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Notification[];
        
        setNotifications(initialNotifications);

        // Then set up real-time listener
        unsubscribe = onSnapshot(
          q,
          {
            next: (snapshot) => {
              const newNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
              })) as Notification[];
              
              setNotifications(newNotifications);
            },
            error: (error: FirestoreError) => {
              console.error('Notifications listener error:', error);
              if (error.code === 'unavailable') {
                toast.error('You are offline. Some features may be limited.');
              } else {
                toast.error('Error loading notifications');
              }
            }
          }
        );
      } catch (error) {
        console.error('Error setting up notifications:', error);
        toast.error('Error loading notifications');
      }
    };

    setupNotifications();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true
      });
      
      // Optimistically update the UI
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Optimistically update the UI
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );

      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          read: true
        })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
      
      // Revert optimistic update on error
      setNotifications(prev => 
        prev.map(n => ({ ...n }))
      );
    }
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    if (!user) return;

    try {
      // Create the in-app notification
      await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: serverTimestamp()
      });

      // Try to send push notification, but don't let it break the flow if it fails
      try {
        const { title, body } = pushNotificationService.getNotificationContent(
          notification.type,
          notification.actorName,
          notification.postContent
        );

        await pushNotificationService.sendPushNotification({
          userId: notification.userId,
          title,
          body,
          data: {
            type: notification.type,
            ...(notification.postId && { postId: notification.postId }),
            ...(notification.commentId && { commentId: notification.commentId })
          }
        });
      } catch (pushError) {
        // Just log push notification errors, don't display them to the user
        console.error('Push notification failed, but in-app notification was created:', pushError);
      }
    } catch (error) {
      console.error('Error adding in-app notification:', error);
      if (error instanceof FirebaseError && error.code === 'unavailable') {
        toast.error('You are offline. The notification will be sent when you reconnect.');
      } else {
        toast.error('Failed to create notification');
      }
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
} 