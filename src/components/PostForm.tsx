import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { spamPreventionService } from '../services/spamPreventionService';
import toast from 'react-hot-toast';

export default function PostForm({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      toast.error('Post content cannot be empty');
      return;
    }

    // Check for spam
    const spamCheck = await spamPreventionService.checkPostSpam();
    if (!spamCheck.allowed) {
      toast.error(spamCheck.message || 'Action not allowed');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        content: trimmedContent,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhotoURL: 'https://i.pravatar.cc/150?img=4',
        createdAt: serverTimestamp(),
        likes: [],
        comments: []
      });

      setContent('');
      toast.success('Post created successfully!');
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
          maxLength={1000}
          disabled={isSubmitting}
        />
        <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
          <span>{content.length}/1000 characters</span>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
} 