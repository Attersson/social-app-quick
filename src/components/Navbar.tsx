import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const isPostsPage = location.pathname === '/';
  const isUsersPage = location.pathname.startsWith('/users');
  const isProfilePage = location.pathname === '/profile';

  const linkClasses = (isActive: boolean) =>
    `border-b-2 inline-flex items-center px-1 pt-1 text-sm font-medium h-full ${
      isActive
        ? 'border-blue-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

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
          <div className="flex items-center h-full">
            {user ? (
              <Link
                to="/profile"
                className={`${linkClasses(isProfilePage)} flex items-center group hover:opacity-80 transition-opacity`}
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
              <Link
                to="/login"
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 