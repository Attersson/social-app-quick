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
import { neo4jService } from '../services/neo4j';

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
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => Promise<boolean>;
  followersCount: number;
  followingCount: number;
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
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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

      // Sync Neo4j user data
      await neo4jService.createUser(user.uid, user.displayName || '');
      
      // Update followers/following counts
      const [followers, following] = await Promise.all([
        neo4jService.getFollowersCount(user.uid),
        neo4jService.getFollowingCount(user.uid)
      ]);
      setFollowersCount(followers);
      setFollowingCount(following);
    } else {
      // Create new user document with all available information
      const userData = {
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        photoURL: 'https://i.pravatar.cc/150?img=4',
        bio: ''
      };
      await setDoc(doc(db, 'users', user.uid), userData);
      setUserBio('');
      
      // Create Neo4j user node
      await neo4jService.createUser(user.uid, userData.displayName);
      
      // Initialize counts
      setFollowersCount(0);
      setFollowingCount(0);
      
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
        setFollowersCount(0);
        setFollowingCount(0);
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
      photoURL: 'https://i.pravatar.cc/150?img=4',
      bio: '',
    });
    
    // Create Neo4j user node
    await neo4jService.createUser(result.user.uid, initialDisplayName);
    
    setUser({ ...result.user, displayName: initialDisplayName });
    setFollowersCount(0);
    setFollowingCount(0);
  };

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncUserData(result.user);
    setUser(result.user);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // First sync the user data which will handle all necessary updates
    await syncUserData(result.user);
    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserBio('');
    setFollowersCount(0);
    setFollowingCount(0);
  };

  const updateUsername = async (username: string) => {
    if (!user) throw new Error('No user logged in');
    
    // Update Auth profile
    await updateProfile(user, { displayName: username });
    
    // Update Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: username
    }, { merge: true });
    
    // Update Neo4j
    await neo4jService.createUser(user.uid, username);
    
    setUser({ ...user, displayName: username });
  };

  const updateBio = async (bio: string) => {
    if (!user) throw new Error('No user logged in');
    await setDoc(doc(db, 'users', user.uid), { bio }, { merge: true });
    setUserBio(bio);
  };

  const followUser = async (userId: string) => {
    if (!user) throw new Error('No user logged in');
    await neo4jService.followUser(user.uid, userId);
    const [followers, following] = await Promise.all([
      neo4jService.getFollowersCount(user.uid),
      neo4jService.getFollowingCount(user.uid)
    ]);
    setFollowersCount(followers);
    setFollowingCount(following);
  };

  const unfollowUser = async (userId: string) => {
    if (!user) throw new Error('No user logged in');
    await neo4jService.unfollowUser(user.uid, userId);
    const [followers, following] = await Promise.all([
      neo4jService.getFollowersCount(user.uid),
      neo4jService.getFollowingCount(user.uid)
    ]);
    setFollowersCount(followers);
    setFollowingCount(following);
  };

  const isFollowing = async (userId: string): Promise<boolean> => {
    if (!user) return false;
    return neo4jService.isFollowing(user.uid, userId);
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
    followUser,
    unfollowUser,
    isFollowing,
    followersCount,
    followingCount,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 