import neo4j, { Driver, Session, Record } from 'neo4j-driver';
import { timeAsync } from '../utils/performanceTimer';

// Neo4j connection configuration
const NEO4J_URI = import.meta.env.VITE_NEO4J_URI;
const NEO4J_USER = import.meta.env.VITE_NEO4J_USER;
const NEO4J_PASSWORD = import.meta.env.VITE_NEO4J_PASSWORD;

// Store callbacks to invalidate caches
type InvalidateCacheCallback = (userId: string) => void;
const cacheInvalidationCallbacks: InvalidateCacheCallback[] = [];

// Add a function to register cache invalidation callbacks
export function registerCacheInvalidationCallback(callback: InvalidateCacheCallback) {
  cacheInvalidationCallbacks.push(callback);
}

interface Follower {
  id: string;
  displayName: string;
  followedAt: Date;
}

class Neo4jService {
  private driver: Driver | null = null;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.initializeDriver().catch(error => {
      console.error('Failed to initialize Neo4j driver in constructor:', error);
    });
  }

  private async initializeDriver() {
    if (!this.connectionPromise) {
      this.connectionPromise = new Promise((resolve, reject) => {
        try {
          // Configure the driver with connection pool settings
          this.driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
            maxConnectionPoolSize: 50,
            connectionTimeout: 30000 // 30 seconds
          });

          // Verify connectivity
          this.driver.verifyConnectivity().then(() => {
            console.log('Successfully connected to Neo4j');
            resolve();
          }).catch((error) => {
            console.error('Failed to connect to Neo4j:', error);
            this.driver = null;
            this.connectionPromise = null;
            reject(error);
          });
        } catch (error) {
          console.error('Failed to initialize Neo4j driver:', error);
          this.driver = null;
          this.connectionPromise = null;
          reject(error);
        }
      });
    }
    return this.connectionPromise;
  }

  async close() {
    const driver = this.driver;
    if (driver) {
      await driver.close();
      this.driver = null;
      this.connectionPromise = null;
    }
  }

  private async getSession(): Promise<Session> {
    await this.initializeDriver();
    const driver = this.driver;
    if (!driver) {
      throw new Error('Failed to initialize Neo4j driver');
    }
    return driver.session();
  }

  // Create a user node in Neo4j
  async createUser(userId: string, displayName: string) {
    const session = await this.getSession();
    try {
      await session.run(
        'MERGE (u:User {id: $userId}) SET u.displayName = $displayName',
        { userId, displayName }
      );
      console.log(`Created/Updated user node for ${displayName} (${userId})`);
    } finally {
      await session.close();
    }
  }

  // Create a FOLLOWS relationship between two users
  async followUser(followerId: string, followingId: string) {
    const session = await this.getSession();
    try {
      // First, ensure both users exist
      await session.run(
        'MERGE (follower:User {id: $followerId}) ' +
        'MERGE (following:User {id: $followingId})',
        { followerId, followingId }
      );

      // Then create the relationship
      const result = await session.run(
        'MATCH (follower:User {id: $followerId}), (following:User {id: $followingId}) ' +
        'MERGE (follower)-[r:FOLLOWS]->(following) ' +
        'SET r.createdAt = datetime() ' +
        'RETURN r',
        { followerId, followingId }
      );

      console.log(`Created FOLLOWS relationship from ${followerId} to ${followingId}`);
      
      // Notify registered services to invalidate their caches
      cacheInvalidationCallbacks.forEach(callback => {
        callback(followerId);
        callback(followingId);
      });
      
      return result.records.length > 0;
    } catch (error) {
      console.error('Error in followUser:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Remove a FOLLOWS relationship between two users
  async unfollowUser(followerId: string, followingId: string) {
    const session = await this.getSession();
    try {
      const result = await session.run(
        'MATCH (follower:User {id: $followerId})-[r:FOLLOWS]->(following:User {id: $followingId}) ' +
        'DELETE r ' +
        'RETURN r',
        { followerId, followingId }
      );
      console.log(`Deleted FOLLOWS relationship from ${followerId} to ${followingId}`);
      
      // Notify registered services to invalidate their caches
      cacheInvalidationCallbacks.forEach(callback => {
        callback(followerId);
        callback(followingId);
      });
      
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  // Get followers count for a user
  async getFollowersCount(userId: string): Promise<number> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        'MATCH (u:User {id: $userId})<-[r:FOLLOWS]-() RETURN count(r) as count',
        { userId }
      );
      return result.records[0].get('count').toNumber();
    } finally {
      await session.close();
    }
  }

  // Get following count for a user
  async getFollowingCount(userId: string): Promise<number> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        'MATCH (u:User {id: $userId})-[r:FOLLOWS]->() RETURN count(r) as count',
        { userId }
      );
      return result.records[0].get('count').toNumber();
    } finally {
      await session.close();
    }
  }

  // Get followers list with pagination
  async getFollowers(userId: string, skip: number = 0, limit: number = 10): Promise<Follower[]> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        'MATCH (u:User {id: $userId})<-[r:FOLLOWS]-(follower:User) ' +
        'RETURN follower.id as id, follower.displayName as displayName, r.createdAt as followedAt ' +
        'ORDER BY r.createdAt DESC ' +
        'SKIP toInteger($skip) LIMIT toInteger($limit)',
        { userId, skip, limit }
      );
      return result.records.map((record: Record) => ({
        id: record.get('id'),
        displayName: record.get('displayName'),
        followedAt: record.get('followedAt')
      }));
    } finally {
      await session.close();
    }
  }

  // Get following list with pagination
  async getFollowing(userId: string, skip: number = 0, limit: number = 10): Promise<Follower[]> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        'MATCH (u:User {id: $userId})-[r:FOLLOWS]->(following:User) ' +
        'RETURN following.id as id, following.displayName as displayName, r.createdAt as followedAt ' +
        'ORDER BY r.createdAt DESC ' +
        'SKIP toInteger($skip) LIMIT toInteger($limit)',
        { userId, skip, limit }
      );
      return result.records.map((record: Record) => ({
        id: record.get('id'),
        displayName: record.get('displayName'),
        followedAt: record.get('followedAt')
      }));
    } finally {
      await session.close();
    }
  }

  // Check if a user is following another user
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        'MATCH (follower:User {id: $followerId})-[r:FOLLOWS]->(following:User {id: $followingId}) ' +
        'RETURN count(r) > 0 as isFollowing',
        { followerId, followingId }
      );
      return result.records[0].get('isFollowing');
    } finally {
      await session.close();
    }
  }

  async getFriendsOfFriends(userId: string) {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (user:User {id: $userId})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(fof:User)
        WHERE NOT (user)-[:FOLLOWS]->(fof)
        AND fof.id <> $userId
        WITH fof, COUNT(DISTINCT friend) as mutualFriends
        RETURN fof.id as id, mutualFriends
        ORDER BY mutualFriends DESC
        LIMIT 10
        `,
        { userId }
      );
      return result.records.map(record => ({
        id: record.get('id'),
        mutualFriends: record.get('mutualFriends').toNumber()
      }));
    } finally {
      await session.close();
    }
  }

  async isMutualFollow(userId: string, otherUserId: string): Promise<boolean> {
    const session = await this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (user:User {id: $userId})-[:FOLLOWS]->(other:User {id: $otherUserId})
        MATCH (other)-[:FOLLOWS]->(user)
        RETURN count(*) > 0 as isMutual
        `,
        { userId, otherUserId }
      );
      return result.records[0]?.get('isMutual') || false;
    } finally {
      await session.close();
    }
  }

  // Get recommended users based on social connections
  async getRecommendedUsers(userId: string, limit: number = 10): Promise<{id: string, score: number, reason: string}[]> {
    const session = await this.getSession();
    try {
      // Find friends of friends with weighted score
      const result = await session.run(
        `
        // Friends of friends recommendation
        MATCH (user:User {id: $userId})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(fof:User)
        WHERE NOT (user)-[:FOLLOWS]->(fof)
        AND fof.id <> $userId
        
        // Calculate recommendation score based on number of mutual connections
        WITH fof, COUNT(DISTINCT friend) as mutualFriends
        
        RETURN fof.id as id, 
               fof.displayName as displayName,
               mutualFriends as mutualCount,
               mutualFriends as score,
               'mutual_friends' as reason
        ORDER BY score DESC, id
        LIMIT toInteger($limit)
        `,
        { userId, limit }
      );
      
      return result.records.map(record => ({
        id: record.get('id'),
        score: record.get('score').toNumber(),
        reason: record.get('reason')
      }));
    } finally {
      await session.close();
    }
  }

  // Get recommended post authors based on social graph
  async getRecommendedContentCreators(userId: string, limit: number = 20): Promise<{id: string, score: number, reason: string}[]> {
    return timeAsync('neo4j.getRecommendedContentCreators.total', async () => {
      const session = await this.getSession();
      try {
        // Combined query for different types of social recommendations
        const queryResult = await timeAsync('neo4j.getRecommendedContentCreators.query', async () => {
          return session.run(
            `
            // Find content creators followed by people user follows (second-degree connections)
            MATCH (user:User {id: $userId})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(contentCreator:User)
            WHERE NOT (user)-[:FOLLOWS]->(contentCreator)
            AND contentCreator.id <> $userId
            
            WITH contentCreator, count(DISTINCT friend) as commonFollowers, 'followed_by_friends' as reason
            
            RETURN contentCreator.id as id,
                 commonFollowers as score,
                 reason
            
            UNION
            
            // Find popular creators among user's extended network
            MATCH (user:User {id: $userId})-[:FOLLOWS]->(:User)<-[:FOLLOWS]-(mutualFollower:User)-[:FOLLOWS]->(popularCreator:User)
            WHERE NOT (user)-[:FOLLOWS]->(popularCreator)
            AND popularCreator.id <> $userId
            
            WITH popularCreator, count(DISTINCT mutualFollower) as sharedFollowers, 'popular_in_network' as reason
            
            RETURN popularCreator.id as id,
                 sharedFollowers as score,
                 reason
            
            ORDER BY score DESC, id
            LIMIT toInteger($limit)
            `,
            { userId, limit }
          );
        }, userId);
        
        // Process the results
        return await timeAsync('neo4j.getRecommendedContentCreators.processing', async () => {
          return queryResult.records.map(record => ({
            id: record.get('id'),
            score: record.get('score').toNumber(),
            reason: record.get('reason')
          }));
        }, userId);
      } finally {
        await session.close();
      }
    }, userId);
  }

  // Get social distance between two users (for content relevance)
  async getSocialDistance(userId: string, otherUserId: string): Promise<number> {
    if (userId === otherUserId) return 0;
    
    const session = await this.getSession();
    try {
      // Find shortest path between users up to distance 3
      const result = await session.run(
        `
        MATCH path = shortestPath((user:User {id: $userId})-[:FOLLOWS*..3]->(other:User {id: $otherUserId}))
        RETURN length(path) as distance
        `,
        { userId, otherUserId }
      );
      
      if (result.records.length === 0) {
        return Infinity; // No path found within 3 hops
      }
      
      return result.records[0].get('distance').toNumber();
    } finally {
      await session.close();
    }
  }
}

export const neo4jService = new Neo4jService(); 