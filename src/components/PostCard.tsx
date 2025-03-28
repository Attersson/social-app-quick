import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { Post, Comment } from '../types/Post';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HeartIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { FollowButton } from './FollowButton';
import MutualFollowBadge from './MutualFollowBadge';
import CommentThread from './CommentThread';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { getDateFromTimestamp } from '../utils/date';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [optimisticLikes, setOptimisticLikes] = useState<string[]>(post.likes || []);
  const [currentPost, setCurrentPost] = useState<Post>(post);

  useEffect(() => {
    setCurrentPost(post);
    setOptimisticLikes(post.likes || []);
  }, [post]);

  // Deep clone the comments array with all nested replies
  const cloneComments = (comments: Comment[]): Comment[] => {
    return comments.map(comment => ({
      ...comment,
      replies: comment.replies ? cloneComments(comment.replies) : []
    }));
  };

  // Update a comment's likes in the nested structure
  const updateCommentLikes = (
    comments: Comment[], 
    targetId: string, 
    newLikes: string[]
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === targetId) {
        return { ...comment, likes: newLikes };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, targetId, newLikes)
        };
      }
      return comment;
    });
  };

  const isLiked = user ? optimisticLikes.includes(user.uid) : false;

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    setIsLiking(true);
    // Store the previous state for potential rollback
    const wasLiked = optimisticLikes.includes(user.uid);
    // Optimistically update the likes
    setOptimisticLikes(wasLiked 
      ? optimisticLikes.filter(id => id !== user.uid)
      : [...optimisticLikes, user.uid]
    );

    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        likes: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      // Only send notification if the post author is not the current user
      if (post.authorId !== user.uid) {
        // Create notification for the post author
        await addNotification({
          userId: post.authorId,
          type: wasLiked ? 'unlike' : 'like',
          actorId: user.uid,
          actorName: user.displayName || 'Anonymous',
          postId: post.id,
          postContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : '') // Include a preview of the post content
        });
      }

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
          createdAt: now,
          likes: [],
          replies: []
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

  const handleReply = async (parentId: string, content: string) => {
    if (!user) {
      toast.error('Please sign in to reply');
      return;
    }

    try {
      const now = new Date();
      const postRef = doc(db, 'posts', post.id);
      
      // Create the new reply
      const newReply = {
        id: crypto.randomUUID(),
        content,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhotoURL: 'https://i.pravatar.cc/150?img=4',
        createdAt: now,
        parentId,
        likes: [],
        replies: []
      };

      // Find the path to the parent comment
      let commentPath: string[] = [];
      const findCommentPath = (comments: Comment[], path: string[] = []): boolean => {
        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];
          const currentPath = [...path, i.toString()];
          
          if (comment.id === parentId) {
            commentPath = currentPath;
            return true;
          }
          
          if (comment.replies && comment.replies.length > 0) {
            const foundInReplies = findCommentPath(comment.replies, [...currentPath, 'replies']);
            if (foundInReplies) {
              return true;
            }
          }
        }
        return false;
      };

      // Clone current comments for optimistic update
      const updatedComments = cloneComments(currentPost.comments || []);
      findCommentPath(updatedComments);

      if (commentPath.length > 0) {
        // Build the Firestore update path
        const updatePath = ['comments', ...commentPath].join('.');
        
        // Get the current replies array
        const targetComment = currentPost.comments.reduce((found: Comment | null, comment: Comment) => {
          if (found) return found;
          if (comment.id === parentId) return comment;
          if (comment.replies) {
            const inReplies = comment.replies.find(r => r.id === parentId);
            if (inReplies) return inReplies;
          }
          return null;
        }, null);

        const currentReplies = targetComment?.replies || [];
        
        // Update Firestore with the new reply
        await updateDoc(postRef, {
          [`${updatePath}.replies`]: [...currentReplies, newReply]
        });

        // Apply optimistic update
        const optimisticallyUpdatedComments = updatedComments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === parentId
                  ? { ...reply, replies: [...(reply.replies || []), newReply] }
                  : reply
              )
            };
          }
          return comment;
        });

        setCurrentPost(prev => ({
          ...prev,
          comments: optimisticallyUpdatedComments
        }));

        onUpdate();
        toast.success('Reply added successfully!');
      } else {
        throw new Error('Parent comment not found');
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
      // Revert optimistic update on error
      setCurrentPost(post);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to like comments');
      return;
    }

    try {
      const postRef = doc(db, 'posts', post.id);
      let commentAuthorId: string | null = null;
      let commentContent: string | null = null;
      let wasLiked = false;
      let commentPath: string[] = [];
      let currentLikes: string[] = [];
      
      // Find the comment and build its path
      const findComment = (comments: Comment[], path: string[] = []): boolean => {
        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];
          const currentPath = [...path, i.toString()];
          
          if (comment.id === commentId) {
            currentLikes = comment.likes || [];
            wasLiked = currentLikes.includes(user.uid);
            commentAuthorId = comment.authorId;
            commentContent = comment.content;
            commentPath = currentPath;
            return true;
          }
          
          if (comment.replies && comment.replies.length > 0) {
            const foundInReplies = findComment(comment.replies, [...currentPath, 'replies']);
            if (foundInReplies) {
              return true;
            }
          }
        }
        return false;
      };

      // Clone current comments for optimistic update
      const updatedComments = cloneComments(currentPost.comments || []);
      findComment(updatedComments);

      // Calculate new likes array
      const newLikes = wasLiked
        ? currentLikes.filter(id => id !== user.uid)
        : [...currentLikes, user.uid];

      // Apply optimistic update
      const optimisticallyUpdatedComments = updateCommentLikes(
        updatedComments,
        commentId,
        newLikes
      );
      setCurrentPost(prev => ({
        ...prev,
        comments: optimisticallyUpdatedComments
      }));

      if (commentPath.length > 0) {
        // Build the Firestore update path
        const updatePath = ['comments', ...commentPath].join('.');
        
        // Find the comment to preserve its fields
        const targetComment = currentPost.comments.reduce((found: Comment | null, comment: Comment) => {
          if (found) return found;
          if (comment.id === commentId) return comment;
          if (comment.replies) {
            const inReplies = comment.replies.find(r => r.id === commentId);
            if (inReplies) return inReplies;
          }
          return null;
        }, null);

        if (targetComment) {
          // Create a clean comment object with only defined fields
          const cleanComment: Partial<Comment> = {
            id: targetComment.id,
            content: targetComment.content,
            authorId: targetComment.authorId,
            authorName: targetComment.authorName,
            createdAt: targetComment.createdAt,
            likes: newLikes,
            replies: targetComment.replies || []
          };

          // Add optional fields only if they exist
          if (targetComment.authorPhotoURL) {
            cleanComment.authorPhotoURL = targetComment.authorPhotoURL;
          }
          if (targetComment.parentId) {
            cleanComment.parentId = targetComment.parentId;
          }

          // Update Firestore with clean comment object
          await updateDoc(postRef, {
            [`${updatePath}`]: cleanComment
          });

          // Send notification if we found the comment and it's not the user's own comment
          if (commentAuthorId && commentAuthorId !== user.uid && commentContent) {
            await addNotification({
              userId: commentAuthorId,
              type: wasLiked ? 'unlike' : 'like',
              actorId: user.uid,
              actorName: user.displayName || 'Anonymous',
              postId: post.id,
              commentId,
              postContent: commentContent,
              isCommentNotification: true
            });
          }
        }
      }

      onUpdate();
    } catch (error) {
      // Revert optimistic update on error
      setCurrentPost(post);
      console.error('Error updating comment like:', error);
      toast.error('Failed to update like');
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
          <span>{currentPost.comments?.length || 0}</span>
        </button>
      </div>
      
      {showComments && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {(currentPost.comments || []).map((comment) => (
            <CommentThread
              key={`${post.id}-${comment.id}`}
              comment={comment}
              postId={post.id}
              onReply={handleReply}
              onLike={handleCommentLike}
            />
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