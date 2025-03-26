import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PencilIcon } from '@heroicons/react/24/solid';
import Breadcrumb from './Breadcrumb';

export default function Profile() {
  const { user, logout, updateUsername, updateBio, userBio } = useAuth();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [username, setUsername] = useState(user?.displayName || '');
  const [bio, setBio] = useState(userBio);

  const handleEditProfilePicture = () => {
    toast.error('Profile picture upload is not implemented yet. This is a placeholder image.');
  };

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    try {
      await updateUsername(username.trim());
      toast.success('Username updated successfully');
      setIsEditingUsername(false);
    } catch (error) {
      console.error('Error updating username:', error);
      toast.error('Failed to update username');
    }
  };

  const handleUpdateBio = async () => {
    if (bio.length > 2000) {
      toast.error('Bio cannot exceed 2000 characters');
      return;
    }

    try {
      await updateBio(bio);
      toast.success('Bio updated successfully');
      setIsEditingBio(false);
    } catch (error) {
      console.error('Error updating bio:', error);
      toast.error('Failed to update bio');
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // For now, we'll just show the current user's profile
  // Later we'll fetch other users' profiles based on the username parameter
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Breadcrumb items={[{ label: 'Profile' }]} />
      
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
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
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {isEditingUsername ? (
                <div className="flex-1 mr-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter username"
                  />
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={handleUpdateUsername}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false);
                        setUsername(user.displayName || '');
                      }}
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {user.displayName || 'Add a username'}
                  </h2>
                  <div
                    onClick={() => setIsEditingUsername(true)}
                    className="ml-2 text-blue-500 hover:text-blue-600 cursor-pointer"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </div>
                </>
              )}
            </div>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bio</h3>
            {!isEditingBio && (
              <div
                onClick={() => setIsEditingBio(true)}
                className="text-blue-500 hover:text-blue-600 cursor-pointer"
              >
                <PencilIcon className="h-4 w-4" />
              </div>
            )}
          </div>
          
          {isEditingBio ? (
            <div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                placeholder="Tell us about yourself..."
                maxLength={2000}
              />
              <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <span className="text-sm text-gray-500">
                  {bio.length}/2000 characters
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleUpdateBio}
                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingBio(false);
                      setBio(userBio);
                    }}
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 whitespace-pre-wrap">
              {bio || 'No bio yet. Click the pencil icon to add one.'}
            </p>
          )}
        </div>

        <div className="mt-6">
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