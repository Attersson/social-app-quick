import { Timestamp } from 'firebase/firestore';

export const getDateFromTimestamp = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
}; 