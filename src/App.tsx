import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import AuthUI from './components/AuthUI';
import Feed from './components/Feed';
import Profile from './components/Profile';
import { UsersList } from './components/UsersList';
import UserProfile from './components/UserProfile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/auth" element={<AuthUI />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/users" element={<UsersList />} />
              <Route path="/users/:userId" element={<UserProfile />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;
