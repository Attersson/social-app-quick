import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Post } from '../types/Post';
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { FollowButton } from './FollowButton';
import MutualFollowBadge from './MutualFollowBadge';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState<string[]>(post.likes);
  const [currentPost, setCurrentPost] = useState<Post>(post);

  useEffect(() => {
    // Set up real-time listener for post updates
    const unsubscribe = onSnapshot(doc(db, 'posts', post.id), (doc) => {
      if (doc.exists()) {
        const updatedPost = { ...doc.data(), id: doc.id } as Post;
        setCurrentPost(updatedPost);
        // Only update optimisticLikes if we're not in the middle of an optimistic update
        if (!isLiking) {
          setOptimisticLikes(updatedPost.likes);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [post.id]);

  const isLiked = user ? optimisticLikes.includes(user.uid) : false;

  const getDateFromTimestamp = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return timestamp;
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    setIsLiking(true);
    // Optimistically update the likes
    const wasLiked = optimisticLikes.includes(user.uid);
    setOptimisticLikes(wasLiked 
      ? optimisticLikes.filter(id => id !== user.uid)
      : [...optimisticLikes, user.uid]
    );

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likes: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      onUpdate();
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticLikes(currentPost.likes);
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const trimmedComment = newComment.trim();
    if (!trimmedComment) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const now = new Date();
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        comments: arrayUnion({
          id: crypto.randomUUID(),
          content: trimmedComment,
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          authorPhotoURL: 'https://i.pravatar.cc/150?img=4',
          createdAt: now
        })
      });
      setNewComment('');
      onUpdate();
      toast.success('Comment added successfully!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3 mb-4">
        <Link to={`/users/${post.authorId}`} className="flex-shrink-0">
          <img
            src={'https://i.pravatar.cc/150?img=4'}
            alt={post.authorName}
            className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"
          />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link to={`/users/${post.authorId}`} className="hover:underline">
                <h3 className="font-semibold text-gray-900">{post.authorName}</h3>
              </Link>
              <MutualFollowBadge userId={post.authorId} />
            </div>
            {user && user.uid !== post.authorId && (
              <FollowButton userId={post.authorId} />
            )}
          </div>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(getDateFromTimestamp(post.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <p className="text-gray-900 mb-4 whitespace-pre-wrap">{currentPost.content}</p>
      <div className="flex items-center space-x-6 border-t border-gray-200 pt-4">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
        >
          {isLiked ? (
            <HeartIconSolid className="h-6 w-6 text-red-500" />
          ) : (
            <HeartIcon className="h-6 w-6" />
          )}
          <span>{optimisticLikes.length}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <ChatBubbleLeftIcon className="h-6 w-6" />
          <span>{currentPost.comments.length}</span>
        </button>
      </div>
      
      {showComments && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {currentPost.comments.map((comment) => (
            <div key={comment.id} className="flex items-start space-x-3 mb-4">
              <Link to={`/users/${comment.authorId}`} className="flex-shrink-0">
                <img
                  src={'https://i.pravatar.cc/150?img=4'}
                  alt={comment.authorName}
                  className="w-8 h-8 rounded-full hover:opacity-80 transition-opacity"
                />
              </Link>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <Link to={`/users/${comment.authorId}`} className="hover:underline">
                    <h4 className="font-semibold text-gray-900">{comment.authorName}</h4>
                  </Link>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(getDateFromTimestamp(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          
          {user && (
            <form onSubmit={handleSubmitComment} className="mt-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmittingComment}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmittingComment || !newComment.trim()}
                >
                  {isSubmittingComment ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
} 