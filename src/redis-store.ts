import { createClient, RedisClientType } from 'redis';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export interface EventStore {
  store(sessionId: string, event: StoredEvent): Promise<void>;
  retrieve(sessionId: string, fromEventId?: string): Promise<StoredEvent[]>;
  cleanup(sessionId: string): Promise<void>;
  isHealthy(): Promise<boolean>;
}

export interface StoredEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

// In-memory fallback implementation
class InMemoryEventStore implements EventStore {
  private events: Map<string, StoredEvent[]> = new Map();

  async store(sessionId: string, event: StoredEvent): Promise<void> {
    if (!this.events.has(sessionId)) {
      this.events.set(sessionId, []);
    }
    const sessionEvents = this.events.get(sessionId)!;
    sessionEvents.push(event);
    
    // Sort by timestamp to maintain order
    sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // Limit to last 1000 events per session
    if (sessionEvents.length > 1000) {
      sessionEvents.splice(0, sessionEvents.length - 1000);
    }
  }

  async retrieve(sessionId: string, fromEventId?: string): Promise<StoredEvent[]> {
    const sessionEvents = this.events.get(sessionId) || [];
    
    if (!fromEventId) {
      return [...sessionEvents];
    }

    const fromIndex = sessionEvents.findIndex(event => event.id === fromEventId);
    if (fromIndex === -1) {
      return [...sessionEvents];
    }

    return sessionEvents.slice(fromIndex + 1);
  }

  async cleanup(sessionId: string): Promise<void> {
    this.events.delete(sessionId);
  }

  async isHealthy(): Promise<boolean> {
    return true; // In-memory store is always "healthy"
  }
}

export class RedisEventStore implements EventStore {
  private client?: RedisClientType;
  private connected: boolean = false;
  private fallback: InMemoryEventStore = new InMemoryEventStore();
  private useFallback: boolean = false;

  constructor(redisUrl?: string) {
    // Check if Redis should be disabled
    if (process.env.DISABLE_REDIS === 'true') {
      console.log('📦 Redis disabled by environment variable, using in-memory storage');
      this.useFallback = true;
      return;
    }

    try {
      this.client = createClient({
        url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.log('📦 Redis connection failed after 3 retries, switching to in-memory storage');
              this.useFallback = true;
              return false; // Stop reconnecting
            }
            return Math.min(retries * 50, 500);
          }
        }
      });

      this.client.on('error', (err) => {
        if (!this.useFallback) {
          console.warn('📦 Redis Client Error, falling back to in-memory storage');
          this.useFallback = true;
        }
      });

      this.client.on('connect', () => {
        console.log('📦 Redis connected');
        this.connected = true;
        this.useFallback = false;
      });

      this.client.on('disconnect', () => {
        console.log('📦 Redis disconnected, using in-memory fallback');
        this.connected = false;
        this.useFallback = true;
      });
    } catch (error) {
      console.warn('📦 Failed to create Redis client, using in-memory fallback');
      this.useFallback = true;
    }
  }

  async connect(): Promise<void> {
    if (this.useFallback || !this.client) {
      console.log('📦 Using in-memory event store (Redis not available)');
      return;
    }

    try {
      if (!this.connected) {
        await this.client.connect();
      }
    } catch (error) {
      console.warn('Failed to connect to Redis, using in-memory fallback:', error);
      this.useFallback = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.disconnect();
    }
  }

  async store(sessionId: string, event: StoredEvent): Promise<void> {
    if (this.useFallback) {
      return this.fallback.store(sessionId, event);
    }

    try {
      await this.connect();
      if (!this.client || this.useFallback) {
        return this.fallback.store(sessionId, event);
      }

      const key = `mcp:session:${sessionId}:events`;
      const eventData = JSON.stringify(event);
      
      // Store event with timestamp as score for ordered retrieval
      await this.client.zAdd(key, {
        score: event.timestamp,
        value: eventData
      });

      // Set expiration for session data (24 hours)
      await this.client.expire(key, 24 * 60 * 60);
    } catch (error) {
      console.warn('Failed to store event in Redis, using fallback:', error);
      this.useFallback = true;
      return this.fallback.store(sessionId, event);
    }
  }

  async retrieve(sessionId: string, fromEventId?: string): Promise<StoredEvent[]> {
    if (this.useFallback) {
      return this.fallback.retrieve(sessionId, fromEventId);
    }

    try {
      await this.connect();
      if (!this.client || this.useFallback) {
        return this.fallback.retrieve(sessionId, fromEventId);
      }

      const key = `mcp:session:${sessionId}:events`;
      
      let minScore = 0;
      if (fromEventId) {
        // Find the timestamp of the fromEventId to get events after it
        const allEvents = await this.client.zRange(key, 0, -1);
        for (const eventStr of allEvents) {
          const event = JSON.parse(eventStr) as StoredEvent;
          if (event.id === fromEventId) {
            minScore = event.timestamp + 1; // Get events after this one
            break;
          }
        }
      }

      const eventStrings = await this.client.zRangeByScore(key, minScore, '+inf');
      return eventStrings.map(str => JSON.parse(str) as StoredEvent);
    } catch (error) {
      console.warn('Failed to retrieve events from Redis, using fallback:', error);
      this.useFallback = true;
      return this.fallback.retrieve(sessionId, fromEventId);
    }
  }

  async cleanup(sessionId: string): Promise<void> {
    if (this.useFallback) {
      return this.fallback.cleanup(sessionId);
    }

    try {
      await this.connect();
      if (!this.client || this.useFallback) {
        return this.fallback.cleanup(sessionId);
      }

      const key = `mcp:session:${sessionId}:events`;
      await this.client.del(key);
    } catch (error) {
      console.warn('Failed to cleanup session in Redis, using fallback:', error);
      this.useFallback = true;
      return this.fallback.cleanup(sessionId);
    }
  }

  async isHealthy(): Promise<boolean> {
    if (this.useFallback) {
      return this.fallback.isHealthy();
    }

    try {
      await this.connect();
      if (!this.client || this.useFallback) {
        return this.fallback.isHealthy();
      }

      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      this.useFallback = true;
      return this.fallback.isHealthy();
    }
  }
}