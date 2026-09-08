/**
 * Sliding-Window In-Memory Rate Limiter
 * 
 * Tracks request timestamps per key (IP address / session user ID)
 * and returns standard rate limit headers (Retry-After, X-RateLimit-*).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

import { redis } from "./redis";

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Duration of the sliding window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

/**
 * Synchronous in-memory sliding window rate limiter
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 10, windowSeconds: 60 }
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const cutoff = now - windowMs;

  let record = store.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    store.set(identifier, record);
  }

  // Retain only timestamps within the active sliding window
  record.timestamps = record.timestamps.filter((timestamp) => timestamp > cutoff);

  const currentCount = record.timestamps.length;
  const isAllowed = currentCount < options.maxRequests;

  if (isAllowed) {
    record.timestamps.push(now);
  }

  const oldestTimestamp = record.timestamps[0] || now;
  const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
  const resetSeconds = Math.ceil(resetMs / 1000);

  return {
    success: isAllowed,
    limit: options.maxRequests,
    remaining: Math.max(0, options.maxRequests - record.timestamps.length),
    reset: resetSeconds,
    retryAfter: isAllowed ? 0 : resetSeconds,
  };
}

/**
 * Distributed Upstash Redis rate limiter with automatic in-memory fallback
 */
export async function rateLimitAsync(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 10, windowSeconds: 60 }
): Promise<RateLimitResult> {
  if (redis.isConfigured()) {
    try {
      const key = `rl:${identifier}`;
      const pipelineRes = await redis.pipeline([
        ["INCR", key],
        ["EXPIRE", key, options.windowSeconds, "NX"],
        ["TTL", key],
      ]);

      if (Array.isArray(pipelineRes) && pipelineRes.length >= 3 && typeof pipelineRes[0] === "number") {
        const count = pipelineRes[0];
        const rawTtl = pipelineRes[2];
        const ttl = typeof rawTtl === "number" && rawTtl > 0 ? rawTtl : options.windowSeconds;
        const isAllowed = count <= options.maxRequests;

        return {
          success: isAllowed,
          limit: options.maxRequests,
          remaining: Math.max(0, options.maxRequests - count),
          reset: ttl,
          retryAfter: isAllowed ? 0 : Math.max(1, ttl),
        };
      }
    } catch (redisErr: any) {
      console.warn("Upstash Redis rate limit fallback to memory:", redisErr?.message || redisErr);
    }
  }

  // Graceful fallback to in-memory sliding window
  return rateLimit(identifier, options);
}

/**
 * Extracts a client IP from Next.js request headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}
