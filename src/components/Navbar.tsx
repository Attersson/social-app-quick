import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationsList from './NotificationsList';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const isPostsPage = location.pathname === '/';
  const isUsersPage = location.pathname.startsWith('/users');
  const isProfilePage = location.pathname === '/profile';

  const linkClasses = (isActive: boolean) =>
    `inline-flex items-center px-3 h-16 border-b-2 text-sm font-medium ${
      isActive
        ? 'border-blue-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between">
          <div className="flex">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900">
                Quick Social App
              </Link>
            </div>
            {user && (
              <div className="hidden sm:ml-6 sm:flex">
                <Link
                  to="/"
                  className={linkClasses(isPostsPage)}
                >
                  Posts
                </Link>
                <Link
                  to="/users"
                  className={linkClasses(isUsersPage)}
                >
                  Users
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationsList />
                <Link
                  to="/profile"
                  className={`${linkClasses(isProfilePage)} group hover:opacity-80 transition-opacity`}
                >
                  <img
                    className="h-8 w-8 rounded-full object-cover"
                    src="https://i.pravatar.cc/150?img=4"
                    alt={user.displayName || 'User avatar'}
                  />
                  <span className="ml-2 text-gray-700 group-hover:text-gray-900">
                    {user.displayName || user.email}
                  </span>
                </Link>
              </div>
            ) : (
              <Link
                to="/auth"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 