import { createClient, type RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let client: RedisClientType | null = null;
let connectPromise: Promise<unknown> | null = null;

function createRedisClient(): RedisClientType {
  const redis = createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 5) return false;
        return 5000;
      },
    },
  });

  redis.on('error', (err: Error) => {
    console.error('Redis connection error:', err.message);
  });

  return redis;
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createRedisClient();
  }

  if (!client.isOpen) {
    if (!connectPromise) {
      connectPromise = client.connect().finally(() => {
        connectPromise = null;
      });
    }
    await connectPromise;
  }

  return client;
}
