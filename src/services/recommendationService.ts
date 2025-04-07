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
import { neo4jService } from './neo4j';
import { Post } from '../types/Post';

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

class RecommendationService {
  // Core function to get recommended posts for a user
  async getRecommendedPosts(
    userId: string,
    count: number = 10,
    excludePostIds: string[] = []
  ): Promise<RecommendedPost[]> {
    if (!userId) {
      return this.getTrendingPosts(count);
    }

    try {
      // 1. Get recommended content creators from social graph
      const recommendedCreators = await neo4jService.getRecommendedContentCreators(userId);
      
      // 2. Fetch recent posts from those creators
      const creatorIds = recommendedCreators.map(creator => creator.id);
      
      if (creatorIds.length === 0) {
        return this.getTrendingPosts(count);
      }
      
      // Fetch posts from recommended creators
      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', 'in', creatorIds.slice(0, 10)), // Firestore supports up to 10 items in 'in' clause
        orderBy('createdAt', 'desc'),
        limit(count * 2) // Fetch more than needed to account for filtering
      );
      
      const postDocs = await getDocs(postsQuery);
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
      posts = posts.filter(post => !excludePostIds.includes(post.id));
      
      // 3. Rank posts based on multiple factors
      const scoredPosts = await this.rankPosts(posts, recommendedCreators);
      
      // 4. Return top recommended posts
      return scoredPosts.slice(0, count);
    } catch (error) {
      console.error('Error getting recommended posts:', error);
      return this.getTrendingPosts(count);
    }
  }

  // Get trending posts as fallback or for non-logged in users
  async getTrendingPosts(count: number = 10, excludePostIds: string[] = []): Promise<RecommendedPost[]> {
    try {
      // For trending, we'll use engagement metrics (likes count, comments count, recency)
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'), // Start with recent posts
        limit(50) // Fetch more posts to rank them
      );
      
      const postDocs = await getDocs(postsQuery);
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
      posts = posts.filter(post => !excludePostIds.includes(post.id));
      
      // Score posts by engagement and recency
      const scoredPosts = posts.map(post => {
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
      
      // Sort by trending score and return top posts
      return scoredPosts
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, count);
    } catch (error) {
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