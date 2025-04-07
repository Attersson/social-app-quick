import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { Toaster } from 'react-hot-toast';
import { useEffect, ReactNode } from 'react';
import Navbar from './components/Navbar';
import AuthUI from './components/AuthUI';
import Feed from './components/Feed';
import Profile from './components/Profile';
import { UsersList } from './components/UsersList';
import UserProfile from './components/UserProfile';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { ActivityFeed } from './components/ActivityFeed/ActivityFeed';
import DiscoverFeed from './components/DiscoverFeed';
import PerformanceDashboard from './components/PerformanceDashboard';
import { recommendationService } from './services/recommendationService';

// Protected route component that requires authentication
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// Separate component to use the auth context
function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  
  // Preload the recommendation cache when a user logs in
  useEffect(() => {
    if (user) {
      recommendationService.preloadCache(user.uid);
    }
  }, [user?.uid]);
  
  // Check cache when navigating to Discover
  useEffect(() => {
    if (location.pathname === '/discover') {
      recommendationService.logCacheStatus();
    }
  }, [location.pathname]);
  
  return (
    <NotificationsProvider user={user}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/auth" element={<AuthUI />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:userId" element={<UserProfile />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/activity" element={<ActivityFeed />} />
            <Route path="/discover" element={<DiscoverFeed />} />
            <Route path="/performance" element={
              <ProtectedRoute>
                <PerformanceDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </NotificationsProvider>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
