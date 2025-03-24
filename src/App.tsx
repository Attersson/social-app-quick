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
        <div className="min-h-screen bg-gray-100 w-full">
          <Navbar />
          <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 min-h-[calc(100vh-64px)]">
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/login" element={<AuthUI />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
