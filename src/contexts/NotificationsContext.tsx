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
  Timestamp,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    // Subscribe to notifications in real-time
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[];
      
      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unreadNotifications = notifications.filter(n => !n.read);
    const updatePromises = unreadNotifications.map(notification =>
      updateDoc(doc(db, 'notifications', notification.id), {
        read: true
      })
    );

    await Promise.all(updatePromises);
  };

  const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    if (!user) return;

    await addDoc(collection(db, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });
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