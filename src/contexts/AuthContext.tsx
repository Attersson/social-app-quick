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

interface UserData {
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
}

interface AuthUpdates {
  displayName?: string;
  photoURL?: string;
}

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

  const syncUserData = async (user: User) => {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      setUserBio(userData.bio || '');
      
      // Update Firestore with any new data from Auth
      const updates: UserData = {};
      if (user.displayName && user.displayName !== userData.displayName) {
        updates.displayName = user.displayName;
      }
      if (user.photoURL && user.photoURL !== userData.photoURL) {
        updates.photoURL = user.photoURL;
      }
      if (user.email && user.email !== userData.email) {
        updates.email = user.email;
      }
      
      if (Object.keys(updates).length > 0) {
        await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      }
      
      // Update Auth profile with any missing data from Firestore
      const authUpdates: AuthUpdates = {};
      if (userData.displayName && userData.displayName !== user.displayName) {
        authUpdates.displayName = userData.displayName;
      }
      if (userData.photoURL && userData.photoURL !== user.photoURL) {
        authUpdates.photoURL = userData.photoURL;
      }
      
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(user, authUpdates);
        setUser({ ...user, ...authUpdates });
      }
    } else {
      // Create new user document with all available information
      const userData = {
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        photoURL: user.photoURL,
        bio: ''
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      setUserBio('');
      
      // Ensure display name is set in Auth profile
      if (!user.displayName) {
        await updateProfile(user, { displayName: userData.displayName });
        setUser({ ...user, displayName: userData.displayName });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await syncUserData(user);
        setUser(user);
      } else {
        setUser(null);
        setUserBio('');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const initialDisplayName = email.split('@')[0];
    
    // Set display name in Auth profile
    await updateProfile(result.user, { displayName: initialDisplayName });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      displayName: initialDisplayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      bio: '',
    });
    
    setUser({ ...result.user, displayName: initialDisplayName });
  };

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncUserData(result.user);
    setUser(result.user);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Create or update user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      bio: '',
    }, { merge: true });
    
    await syncUserData(result.user);
    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserBio('');
  };

  const updateUsername = async (username: string) => {
    if (!user) throw new Error('No user logged in');
    
    // Update Auth profile
    await updateProfile(user, { displayName: username });
    
    // Update Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: username
    }, { merge: true });
    
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