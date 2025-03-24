import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import AuthUI from './components/AuthUI';
import Feed from './components/Feed';
import Profile from './components/Profile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <Routes>
                <Route path="/" element={<Feed />} />
                <Route path="/create" element={<div>Create Post (Coming Soon)</div>} />
                <Route path="/login" element={<AuthUI />} />
                <Route path="/signup" element={<AuthUI />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </div>
          </main>
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
