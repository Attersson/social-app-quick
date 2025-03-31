import { useState, useEffect } from 'react';
import { getDailyAnalytics, getUserAnalytics } from '../services/analyticsService';
import { DailyAnalytics, UserAnalytics } from '../types/Analytics';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, limit, getDocs, FieldValue } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Post } from '../types/Post';

// Helper function to safely display numbers from FieldValue
const displayNumber = (value: number | FieldValue | undefined): number => {
  if (typeof value === 'number') return value;
  return 0;
};

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyAnalytics | null>(null);
  const [userStats, setUserStats] = useState<UserAnalytics | null>(null);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch daily statistics
        const dailyData = await getDailyAnalytics(today);
        setDailyStats(dailyData);

        // Fetch user statistics
        const userData = await getUserAnalytics(user.uid);
        setUserStats(userData);

        // Fetch top posts (by likes)
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('likes', 'desc'),
          limit(5)
        );
        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post));
        setTopPosts(postsData);

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Please sign in to view analytics.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      {/* Today's Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Active Users Today</h3>
          <p className="text-3xl font-bold text-blue-600">{displayNumber(dailyStats?.activeUsers)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Total Views Today</h3>
          <p className="text-3xl font-bold text-green-600">{displayNumber(dailyStats?.totalViews)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">New Comments Today</h3>
          <p className="text-3xl font-bold text-purple-600">{displayNumber(dailyStats?.newComments)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Total Likes Today</h3>
          <p className="text-3xl font-bold text-red-600">{displayNumber(dailyStats?.totalLikes)}</p>
        </div>
      </div>

      {/* Your Activity */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">Your Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Comments Created</h3>
            <p className="text-3xl font-bold text-blue-600">{displayNumber(userStats?.commentsCreated)}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Likes Given</h3>
            <p className="text-3xl font-bold text-green-600">{displayNumber(userStats?.likesGiven)}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Total Engagement</h3>
            <p className="text-3xl font-bold text-purple-600">{displayNumber(userStats?.totalEngagement)}</p>
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Top Posts</h2>
        <div className="space-y-4">
          {topPosts.map((post) => (
            <div key={post.id} className="border-b last:border-b-0 pb-4">
              <p className="text-gray-800 mb-2">{post.content}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-4">👍 {post.likes?.length || 0} likes</span>
                <span>💬 {post.comments?.length || 0} comments</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 