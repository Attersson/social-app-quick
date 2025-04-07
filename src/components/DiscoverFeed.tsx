import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Post as PostType } from '../types/Post';
import { recommendationService, RecommendedPost, RecommendationSource } from '../services/recommendationService';
import PostCard from './PostCard';
import Breadcrumb from './Breadcrumb';
import FollowRecommendations from './FollowRecommendations';

export default function DiscoverFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<RecommendedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RecommendationSource>('social_network');
  const [viewedPostIds, setViewedPostIds] = useState<string[]>([]);

  // Load recommended posts
  useEffect(() => {
    const loadRecommendedPosts = async () => {
      setLoading(true);
      try {
        let recommendedPosts: RecommendedPost[] = [];

        if (activeTab === 'trending') {
          recommendedPosts = await recommendationService.getTrendingPosts(10, viewedPostIds);
        } else {
          if (user) {
            recommendedPosts = await recommendationService.getRecommendedPosts(
              user.uid, 
              10, 
              viewedPostIds
            );
          } else {
            // Fallback to trending for non-logged in users
            recommendedPosts = await recommendationService.getTrendingPosts(10, viewedPostIds);
          }
        }

        setPosts(recommendedPosts);
      } catch (error) {
        console.error('Error loading recommended posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendedPosts();
  }, [user, activeTab, viewedPostIds]);

  const handlePostUpdate = () => {
    // Keep track of viewed posts to avoid showing them again
    const currentPostIds = posts.map(post => post.id);
    setViewedPostIds(prev => [...prev, ...currentPostIds]);
  };

  // Helper function to get human-readable recommendation reason
  const getRecommendationReason = (post: RecommendedPost): string => {
    switch (post.recommendationReason) {
      case 'mutual_friends':
        return 'Recommended because people you follow also follow this creator';
      case 'followed_by_friends':
        return 'Popular among people you follow';
      case 'popular_in_network':
        return 'Popular in your network';
      case 'high_engagement':
        return 'Trending post with high engagement';
      case 'trending':
        return 'Trending in the community';
      default:
        return '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Breadcrumb items={[{ label: 'Discover' }]} />
      
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('social_network')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'social_network'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'trending'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Trending
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Discovering content for you...</p>
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map(post => (
                <div key={post.id} className="space-y-1">
                  <PostCard post={post as PostType} onUpdate={handlePostUpdate} />
                  {post.recommendationReason && (
                    <div className="text-xs text-gray-500 px-4">
                      {getRecommendationReason(post)}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-center py-4">
                <button 
                  onClick={() => setViewedPostIds([])} 
                  className="text-blue-500 hover:text-blue-700"
                >
                  Refresh recommendations
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-600">
                {user 
                  ? "We don't have any recommendations for you yet. Try following more users!" 
                  : "Sign in to see personalized recommendations."}
              </p>
            </div>
          )}
        </div>
        
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <h3 className="font-medium mb-4">How recommendations work</h3>
            <p className="text-sm text-gray-600 mb-2">
              We recommend content based on:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
              <li>Your social connections</li>
              <li>Post engagement</li>
              <li>Content recency</li>
              <li>Post popularity</li>
            </ul>
          </div>
          {user && <FollowRecommendations />}
        </div>
      </div>
    </div>
  );
} 