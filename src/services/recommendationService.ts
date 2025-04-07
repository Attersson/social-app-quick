import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { neo4jService, registerCacheInvalidationCallback } from './neo4j';
import { Post } from '../types/Post';
import { timeAsync, startTimer } from '../utils/performanceTimer';

// Interface for recommended content with metadata
export interface RecommendedPost extends Post {
  recommendationScore: number;
  recommendationReason: string;
}

// Types of recommendation sources for analytics tracking
export type RecommendationSource = 
  | 'social_network' 
  | 'trending' 
  | 'interest_based' 
  | 'chronological';

// Cache interface for storing recommendations
interface RecommendationCache {
  data: RecommendedPost[];
  timestamp: number;
  userId: string;
  source: RecommendationSource;
}

class RecommendationService {
  // Cache configuration
  private CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
  private recommendationsCache: Map<string, RecommendationCache> = new Map();
  private MAX_CACHED_POSTS = 50; // Store up to 50 posts in cache
  
  constructor() {
    // Register the cache invalidation callback with the Neo4j service
    registerCacheInvalidationCallback(this.invalidateUserCache.bind(this));
  }
  
  // Invalidate all caches for a specific user
  public invalidateUserCache(userId: string): void {
    // Find all cache keys for this user and remove them
    for (const [key, cache] of this.recommendationsCache.entries()) {
      if (cache.userId === userId) {
        this.recommendationsCache.delete(key);
      }
    }
  }
  
  // Debug method to print cache status
  public logCacheStatus(): void {
    // Keeping the method signature but removing logging
  }
  
  // Generate a cache key
  private getCacheKey(
    userId: string, 
    source: RecommendationSource = 'social_network',
    count: number = 10
  ): string {
    // Create a stable cache key that doesn't change with excluded posts
    return `${userId}:${source}:${count}`;
  }
  
  // Check if cache is valid
  private isCacheValid(cache: RecommendationCache): boolean {
    const now = Date.now();
    const ageMs = now - cache.timestamp;
    return ageMs < this.CACHE_TTL;
  }

  // Preload the cache in the background - can be called on app startup or user login
  public async preloadCache(userId: string): Promise<void> {
    if (!userId) return;
    
    // Check if we already have valid cache entries
    const socialCacheKey = this.getCacheKey(userId, 'social_network', 10);
    const trendingCacheKey = this.getCacheKey('trending', 'trending', 10);
    
    const hasSocialCache = this.recommendationsCache.has(socialCacheKey) && 
                            this.isCacheValid(this.recommendationsCache.get(socialCacheKey)!);
    
    const hasTrendingCache = this.recommendationsCache.has(trendingCacheKey) && 
                               this.isCacheValid(this.recommendationsCache.get(trendingCacheKey)!);
    
    // First, ensure trending cache is loaded since we might need it as fallback
    if (!hasTrendingCache) {
      try {
        await this.getTrendingPosts(10, []);
      } catch (err) {
        // Silent error handling
      }
    }
    
    // Then load social recommendations if needed
    if (!hasSocialCache) {
      try {
        // We pass empty excludePostIds to populate the cache with fresh data
        await this.getRecommendedPosts(userId, 10, []);
      } catch (err) {
        // Silent error handling
      }
    }
  }

  // Core function to get recommended posts for a user
  async getRecommendedPosts(
    userId: string,
    count: number = 10,
    excludePostIds: string[] = [],
    skipNetworkRequests: boolean = false
  ): Promise<RecommendedPost[]> {
    // Start overall performance timer
    const timer = startTimer(`getRecommendedPosts(${count})`, userId);
    
    try {
      // If no user ID, fall back to trending posts (which might also be cached)
      if (!userId) {
        const result = await this.getTrendingPosts(count, excludePostIds, skipNetworkRequests);
        timer.stop('success', { source: 'trending_fallback', reason: 'no_user_id' });
        return result;
      }
      
      // Check cache first - use a stable key without excluded posts
      const cacheKey = this.getCacheKey(userId, 'social_network', count);
      const cachedResult = this.recommendationsCache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        // Filter out excluded posts from the cached results
        if (excludePostIds.length > 0) {
          const filteredResults = cachedResult.data.filter(post => 
            !excludePostIds.includes(post.id)
          );
          
          // If we have enough posts after filtering, return them
          if (filteredResults.length >= count / 2) {
            timer.stop('success', { source: 'cache', filtered: true });
            return filteredResults.slice(0, count);
          }
          // Otherwise, we need to fetch new posts (cache miss)
        } else {
          // No posts to exclude, return the cached data directly
          timer.stop('success', { source: 'cache', filtered: false });
          return cachedResult.data.slice(0, count);
        }
      } else {
        if (!cachedResult) {
          // No cache entry
        } else {
          // Expired cache
        }
      }
      
      // If we're skipping network requests (for StrictMode double-mount in dev)
      // Return empty array instead of making network requests
      if (skipNetworkRequests) {
        // Check if we have any cached posts already - return those instead of empty array
        if (cachedResult && this.isCacheValid(cachedResult)) {
          // Return filtered cache results
          if (excludePostIds.length > 0) {
            const filteredResults = cachedResult.data.filter(post => 
              !excludePostIds.includes(post.id)
            );
            timer.stop('success', { source: 'cache_strict_mode', filtered: true });
            return filteredResults.slice(0, count);
          }
          timer.stop('success', { source: 'cache_strict_mode', filtered: false });
          return cachedResult.data.slice(0, count);
        }
        // Otherwise return empty array
        timer.stop('success', { source: 'empty_strict_mode' });
        return [];
      }
      
      // 1. Get recommended content creators from social graph
      const recommendedCreators = await timeAsync(
        'neo4j.getRecommendedContentCreators', 
        () => neo4jService.getRecommendedContentCreators(userId),
        userId
      );
      
      // 2. Fetch recent posts from those creators
      const creatorIds = recommendedCreators.map(creator => creator.id);
      
      if (creatorIds.length === 0) {
        // Get trending posts as fallback
        const trendingPosts = await this.getTrendingPosts(count, excludePostIds, skipNetworkRequests);
        
        // Cache these trending posts as recommendations for this user
        // This way, future requests will hit the cache even when there are no Neo4j recommendations
        this.recommendationsCache.set(cacheKey, {
          data: trendingPosts.slice(0, this.MAX_CACHED_POSTS),
          timestamp: Date.now(),
          userId,
          source: 'social_network' // Store as social_network type to match the cache key
        });
        
        timer.stop('success', { source: 'trending_fallback', reason: 'no_creators' });
        return trendingPosts;
      }
      
      // Fetch posts from recommended creators
      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', 'in', creatorIds.slice(0, 10)), // Firestore supports up to 10 items in 'in' clause
        orderBy('createdAt', 'desc'),
        limit(count * 3) // Fetch more than needed to account for filtering
      );
      
      // Time the Firestore query
      const postDocs = await timeAsync(
        'firestore.getRecommendedPosts', 
        () => getDocs(postsQuery),
        userId
      );
      
      let posts = postDocs.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          comments: data.comments || []
        } as Post;
      });
      
      // Filter out excluded posts
      if (excludePostIds.length > 0) {
        posts = posts.filter(post => !excludePostIds.includes(post.id));
      }
      
      // 3. Rank posts based on multiple factors
      const scoredPosts = await timeAsync(
        'rankPosts', 
        () => this.rankPosts(posts, recommendedCreators),
        userId
      );
      
      // Store more posts in cache (up to MAX_CACHED_POSTS)
      const postsToCache = scoredPosts.slice(0, this.MAX_CACHED_POSTS);
      this.recommendationsCache.set(cacheKey, {
        data: postsToCache,
        timestamp: Date.now(),
        userId,
        source: 'social_network'
      });
      
      // 4. Return top recommended posts (only the requested count)
      const result = scoredPosts.slice(0, count);
      timer.stop('success', { source: 'fresh', postsCount: result.length });
      return result;
    } catch (error) {
      timer.stop('error', { error: error instanceof Error ? error.message : String(error) });
      // Keep error logs
      console.error('Error getting recommended posts:', error);
      
      // Get trending posts as fallback
      const trendingPosts = await this.getTrendingPosts(count, excludePostIds, skipNetworkRequests);
      
      // Cache these trending posts as recommendations for this user
      // This ensures future requests still hit the cache even after errors
      this.recommendationsCache.set(this.getCacheKey(userId, 'social_network', count), {
        data: trendingPosts.slice(0, this.MAX_CACHED_POSTS),
        timestamp: Date.now(),
        userId,
        source: 'social_network' // Store as social_network type to match the cache key
      });
      
      return trendingPosts;
    }
  }

  // Get trending posts as fallback or for non-logged in users
  async getTrendingPosts(
    count: number = 10,
    excludePostIds: string[] = [],
    skipNetworkRequests: boolean = false
  ): Promise<RecommendedPost[]> {
    // Start overall performance timer
    const timer = startTimer(`getTrendingPosts(${count})`, 'system');
    
    try {
      // For trending posts, use a different cache key
      const cacheKey = this.getCacheKey('trending', 'trending', count);
      const cachedResult = this.recommendationsCache.get(cacheKey);
      
      if (cachedResult && this.isCacheValid(cachedResult)) {
        // Filter out excluded posts from the cached results
        if (excludePostIds.length > 0) {
          const filteredResults = cachedResult.data.filter(post => 
            !excludePostIds.includes(post.id)
          );
          
          // If we have enough posts after filtering, return them
          if (filteredResults.length >= count / 2) {
            timer.stop('success', { source: 'cache', filtered: true });
            return filteredResults.slice(0, count);
          }
          // Otherwise, we need to fetch new posts (cache miss)
        } else {
          // No posts to exclude, return the cached data directly
          timer.stop('success', { source: 'cache', filtered: false });
          return cachedResult.data.slice(0, count);
        }
      } else {
        if (!cachedResult) {
          // No cache entry
        } else {
          // Expired cache
        }
      }
      
      // If we're skipping network requests (for StrictMode double-mount in dev)
      // Return empty array instead of making network requests
      if (skipNetworkRequests) {
        // Check if we have any cached posts already - return those instead of empty array
        if (cachedResult && this.isCacheValid(cachedResult)) {
          // Return filtered cache results
          if (excludePostIds.length > 0) {
            const filteredResults = cachedResult.data.filter(post => 
              !excludePostIds.includes(post.id)
            );
            timer.stop('success', { source: 'cache_strict_mode', filtered: true });
            return filteredResults.slice(0, count);
          }
          timer.stop('success', { source: 'cache_strict_mode', filtered: false });
          return cachedResult.data.slice(0, count);
        }
        // Otherwise return empty array
        timer.stop('success', { source: 'empty_strict_mode' });
        return [];
      }
      
      // For trending, we'll use engagement metrics (likes count, comments count, recency)
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'), // Start with recent posts
        limit(100) // Fetch more posts to rank them (increased from 50)
      );
      
      // Time the Firestore query
      const postDocs = await timeAsync(
        'firestore.getTrendingPosts', 
        () => getDocs(postsQuery),
        'system'
      );
      
      let posts = postDocs.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          comments: data.comments || []
        } as Post;
      });
      
      // Filter out excluded posts
      if (excludePostIds.length > 0) {
        posts = posts.filter(post => !excludePostIds.includes(post.id));
      }
      
      // Time the scoring operation
      const scoredPosts = await timeAsync<RecommendedPost[]>(
        'scoreTrendingPosts', 
        () => Promise.resolve().then(() => {
          // Score posts by engagement and recency
          return posts.map(post => {
            const likesCount = post.likes?.length || 0;
            const commentsCount = post.comments?.length || 0;
            
            // Calculate hours since post creation
            const createdAtDate = post.createdAt instanceof Timestamp ? post.createdAt.toDate() : post.createdAt;
            const hoursSinceCreation = 
              (new Date().getTime() - createdAtDate.getTime()) / (1000 * 60 * 60);
            
            // Simple trending score formula: (likes + comments*1.5) / hours^0.8
            // This gives recent posts with high engagement more weight
            const trendingScore = hoursSinceCreation > 0 
              ? (likesCount + commentsCount * 1.5) / Math.pow(hoursSinceCreation, 0.8)
              : (likesCount + commentsCount * 1.5);
              
            return {
              ...post,
              recommendationScore: trendingScore,
              recommendationReason: 'trending'
            };
          });
        }),
        'system'
      );
      
      // Sort by trending score
      const sortedPosts = scoredPosts
        .sort((a: RecommendedPost, b: RecommendedPost) => b.recommendationScore - a.recommendationScore);
      
      // Store more posts in cache (up to MAX_CACHED_POSTS)
      const postsToCache = sortedPosts.slice(0, this.MAX_CACHED_POSTS);
      this.recommendationsCache.set(cacheKey, {
        data: postsToCache,
        timestamp: Date.now(),
        userId: 'trending',
        source: 'trending'
      });
        
      // Return only the requested count
      const result = sortedPosts.slice(0, count);
      timer.stop('success', { source: 'fresh', postsCount: result.length });
      return result;
    } catch (error) {
      timer.stop('error', { error: error instanceof Error ? error.message : String(error) });
      // Keep error logs
      console.error('Error getting trending posts:', error);
      return [];
    }
  }

  // Rank posts based on multiple factors
  private async rankPosts(
    posts: Post[], 
    recommendedCreators: {id: string, score: number, reason: string}[]
  ): Promise<RecommendedPost[]> {
    // Create a map of creator scores for quick lookup
    const creatorScoreMap = new Map<string, {score: number, reason: string}>();
    recommendedCreators.forEach(creator => {
      creatorScoreMap.set(creator.id, {
        score: creator.score,
        reason: creator.reason
      });
    });
    
    // Calculate scores for each post
    const scoredPosts = await Promise.all(posts.map(async post => {
      // Base score from creator's social relevance
      const creatorInfo = creatorScoreMap.get(post.authorId) || { score: 1, reason: 'default' };
      let score = creatorInfo.score;
      let reason = creatorInfo.reason;
      
      // Engagement factor: more engagement = higher score
      const likesCount = post.likes?.length || 0;
      const commentsCount = post.comments?.length || 0;
      const engagementScore = likesCount * 1 + commentsCount * 1.5;
      score += engagementScore;
      
      // Recency factor: newer posts get higher scores
      const createdAtDate = post.createdAt instanceof Timestamp ? post.createdAt.toDate() : post.createdAt;
      const hoursSinceCreation = 
        (new Date().getTime() - createdAtDate.getTime()) / (1000 * 60 * 60);
      const recencyScore = 10 / (1 + Math.log(1 + hoursSinceCreation)); // Logarithmic decay
      score += recencyScore;
      
      // If the post has high engagement but not from social graph, update reason
      if (engagementScore > 10 && reason === 'default') {
        reason = 'high_engagement';
      }
      
      return {
        ...post,
        recommendationScore: score,
        recommendationReason: reason
      };
    }));
    
    // Sort by final score
    return scoredPosts.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }
}

export const recommendationService = new RecommendationService(); 