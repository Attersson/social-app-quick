import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationsList from './NotificationsList';
import { 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  UsersIcon, 
  BellIcon, 
  SparklesIcon, 
  ClockIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isPostsPage = location.pathname === '/';
  const isUsersPage = location.pathname.startsWith('/users');
  const isAnalyticsPage = location.pathname === '/analytics';
  const isActivityPage = location.pathname === '/activity';
  const isDiscoverPage = location.pathname === '/discover';
  const isPerformancePage = location.pathname === '/performance';

  // Large screen horizontal layout
  const lgLinkClasses = (isActive: boolean) =>
    `inline-flex items-center px-2 h-16 border-b-2 text-sm font-medium ${
      isActive
        ? 'border-blue-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;
  
  // Medium screen compact layout with icon above text
  const mdLinkClasses = (isActive: boolean) =>
    `flex flex-col items-center justify-center pt-1 pb-1 px-1 h-16 border-b-2 text-xs font-medium ${
      isActive
        ? 'border-blue-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;
    
  // Mobile menu layout  
  const mobileLinkClasses = (isActive: boolean) =>
    `flex items-center px-4 py-3 text-base font-medium ${
      isActive
        ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
        : 'border-l-4 border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
    }`;

  const navLinks = user ? [
    {
      to: '/',
      label: 'Posts',
      icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
      isActive: isPostsPage
    },
    {
      to: '/discover',
      label: 'Discover',
      icon: <SparklesIcon className="h-5 w-5" />,
      isActive: isDiscoverPage
    },
    {
      to: '/users',
      label: 'Users',
      icon: <UsersIcon className="h-5 w-5" />,
      isActive: isUsersPage
    },
    {
      to: '/activity',
      label: 'Activity',
      icon: <BellIcon className="h-5 w-5" />,
      isActive: isActivityPage
    },
    {
      to: '/analytics',
      label: 'Analytics',
      icon: <ChartBarIcon className="h-5 w-5" />,
      isActive: isAnalyticsPage
    },
    {
      to: '/performance',
      label: 'Performance',
      icon: <ClockIcon className="h-5 w-5" />,
      isActive: isPerformancePage
    }
  ] : [];

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-gray-900 sm:text-2xl">
                Quick Social App
              </Link>
            </div>
            
            {/* Hidden on small, vertical layout on medium, horizontal on large */}
            {user && (
              <div className="hidden md:flex md:ml-4 lg:ml-6">
                {/* Medium screens - vertical layout */}
                <div className="flex md:flex lg:hidden">
                  {navLinks.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={mdLinkClasses(link.isActive)}
                    >
                      {link.icon}
                      <span className="mt-1">{link.label}</span>
                    </Link>
                  ))}
                </div>
                
                {/* Large screens - horizontal layout */}
                <div className="hidden lg:flex">
                  {navLinks.map(link => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={lgLinkClasses(link.isActive)}
                    >
                      <span className="mr-1">{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile menu button - only visible on small screens */}
          <div className="flex items-center md:hidden">
            {user && (
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationsList />
                <Link
                  to="/profile"
                  className="group hover:opacity-80 transition-opacity flex items-center"
                >
                  <img
                    className="h-8 w-8 rounded-full object-cover"
                    src="https://i.pravatar.cc/150?img=4"
                    alt={user.displayName || 'User avatar'}
                  />
                  <span className="ml-2 text-gray-700 group-hover:text-gray-900 hidden sm:inline">
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

      {/* Mobile menu, show/hide based on menu state */}
      {mobileMenuOpen && user && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={mobileLinkClasses(link.isActive)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
} 