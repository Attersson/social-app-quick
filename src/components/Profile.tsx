import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();

  const handleEditProfilePicture = () => {
    toast.error('Profile picture upload is not implemented yet. This is a placeholder image.');
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For now, we'll just show the current user's profile
  // Later we'll fetch other users' profiles based on the username parameter
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative group">
            <img
              className="h-20 w-20 rounded-full object-cover"
              src="https://i.pravatar.cc/150?img=4"
              alt={user.displayName || 'User avatar'}
            />
            <button
              onClick={handleEditProfilePicture}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <span className="text-white text-sm font-medium">Change Photo</span>
            </button>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user.displayName || user.email}
            </h2>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold mb-4">About</h3>
          <p className="text-gray-600">
            {user.displayName ? (
              `Welcome to ${user.displayName}'s profile!`
            ) : (
              'Welcome to your profile!'
            )}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <button
            onClick={logout}
            className="w-full bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
} 