import { useAuth } from '../contexts/AuthContext';

export default function Feed() {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Welcome to your Feed</h2>
        <p className="text-gray-600 mb-6">
          {user ? (
            `Hello, ${user.displayName || user.email}! Your feed will appear here.`
          ) : (
            'Please sign in to see your feed.'
          )}
        </p>
        <div className="space-y-4">
          {/* Placeholder for posts */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-gray-500 text-center">Posts will appear here</p>
          </div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-gray-500 text-center">Posts will appear here</p>
          </div>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-gray-500 text-center">Posts will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
} 