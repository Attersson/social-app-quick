import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Comment } from '../types/Post';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface CommentThreadProps {
  comment: Comment;
  postId: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  level?: number;
}

export default function CommentThread({ comment, postId, onReply, onLike, level = 0 }: CommentThreadProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(true);
  const isLiked = comment.likes?.includes(user?.uid || '') || false;

  const getDateFromTimestamp = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return timestamp;
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      await onLike(comment.id);
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  return (
    <div className={`${level > 0 ? 'ml-8 border-l border-gray-200 pl-4' : ''}`}>
      <div className="flex items-start space-x-3 mb-2">
        <Link to={`/users/${comment.authorId}`} className="flex-shrink-0">
          <img
            src={comment.authorPhotoURL || 'https://i.pravatar.cc/150?img=4'}
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
          <div className="flex items-center space-x-4 mt-1 text-sm">
            <p className="text-gray-500">
              {formatDistanceToNow(getDateFromTimestamp(comment.createdAt), { addSuffix: true })}
            </p>
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
            >
              {isLiked ? (
                <HeartIconSolid className="h-4 w-4 text-red-500" />
              ) : (
                <HeartIcon className="h-4 w-4" />
              )}
              <span>{comment.likes?.length || 0}</span>
            </button>
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-gray-500 hover:text-blue-500"
            >
              Reply
            </button>
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
              >
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {isReplying && (
        <form onSubmit={handleSubmitReply} className="ml-11 mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!replyContent.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reply
            </button>
          </div>
        </form>
      )}

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              onLike={onLike}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
} 