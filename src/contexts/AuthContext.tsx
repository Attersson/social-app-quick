import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updateBio: (bio: string) => Promise<void>;
  userBio: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userBio, setUserBio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user's bio from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserBio(userDoc.data().bio || '');
        } else {
          // Create user document if it doesn't exist
          await setDoc(doc(db, 'users', user.uid), { bio: '' });
          setUserBio('');
        }
      } else {
        setUserBio('');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    setUser(result.user);
    // Create user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), { bio: '' });
  };

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    setUser(result.user);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
    // Create user document in Firestore if it doesn't exist
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', result.user.uid), { bio: '' });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserBio('');
  };

  const updateUsername = async (username: string) => {
    if (!user) throw new Error('No user logged in');
    await updateProfile(user, { displayName: username });
    setUser({ ...user, displayName: username });
  };

  const updateBio = async (bio: string) => {
    if (!user) throw new Error('No user logged in');
    await setDoc(doc(db, 'users', user.uid), { bio }, { merge: true });
    setUserBio(bio);
  };

  const value = {
    user,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    updateUsername,
    updateBio,
    userBio,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 