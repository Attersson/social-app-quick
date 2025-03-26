import neo4j, { Driver, Session, Record } from 'neo4j-driver';

// Neo4j connection configuration
const NEO4J_URI = import.meta.env.VITE_NEO4J_URI;
const NEO4J_USER = import.meta.env.VITE_NEO4J_USER;
const NEO4J_PASSWORD = import.meta.env.VITE_NEO4J_PASSWORD;

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
}

export const neo4jService = new Neo4jService(); 