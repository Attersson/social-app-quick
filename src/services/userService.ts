import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface UserData {
  displayName: string;
  photoURL: string;
}

export const getUserData = async (userId: string): Promise<UserData> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return userDoc.data() as UserData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    // Return default data if user not found
    return {
      displayName: 'Unknown User',
      photoURL: 'https://i.pravatar.cc/150?img=4'
    };
  }
}; 