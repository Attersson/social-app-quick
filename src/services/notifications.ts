import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification } from '../types/Notification';

export const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      ...notification,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
}; 