import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FirebaseError } from 'firebase/app';

function AuthUI() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, signInWithGoogle, logout, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error: unknown) {
      console.error('Authentication error:', error);
      if (error instanceof FirebaseError) {
        setError(error.message);
      } else {
        setError('An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      if (error instanceof FirebaseError) {
        setError(error.message);
      } else {
        setError('An error occurred during Google sign-in');
      }
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-gray-700">Welcome, {user.email}</p>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      <div className="mt-4">
        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          Sign in with Google
        </button>
      </div>
      <p className="mt-4 text-center text-sm text-gray-600">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-blue-500 hover:text-blue-600"
          disabled={loading}
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Instagram Clone
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <AuthUI />
          </div>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
