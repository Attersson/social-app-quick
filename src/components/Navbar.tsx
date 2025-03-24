import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900">
                Quick Social App
              </Link>
            </div>
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Feed
                </Link>
                <Link
                  to="/create"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Create Post
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <Link
                to="/profile"
                className="flex items-center group hover:opacity-80 transition-opacity"
              >
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src="https://i.pravatar.cc/150?img=4"
                  alt={user.displayName || 'User avatar'}
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                  {user.displayName || user.email}
                </span>
              </Link>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/login"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 