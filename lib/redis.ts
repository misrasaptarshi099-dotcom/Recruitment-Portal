/**
 * Zero-Dependency Upstash Redis REST Client
 * 
 * Provides fast, resilient distributed caching and rate-limiting using native fetch.
 * Fully compatible with Node.js, Vercel Serverless, and Next.js Edge Runtime.
 */

function getCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return {
    url,
    token,
    isConfigured: Boolean(url && token),
  };
}

interface SetOptions {
  /** Time-to-live in seconds (EX) */
  ex?: number;
  /** Only set if key does not exist (NX) */
  nx?: boolean;
}

async function executeCommand<T = any>(command: (string | number)[]): Promise<T | null> {
  const { url, token, isConfigured } = getCredentials();
  if (!isConfigured || !url || !token) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Upstash Redis command failed [${command[0]}]: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    return data.result !== undefined ? data.result : null;
  } catch (err: any) {
    if (err.name !== "AbortError") {
      console.warn(`Upstash Redis error [${command[0]}]:`, err?.message || err);
    }
    return null;
  }
}

export const redis = {
  isConfigured: () => getCredentials().isConfigured,

  /**
   * Ping Redis to verify connectivity
   */
  async ping(): Promise<boolean> {
    const res = await executeCommand<string>(["PING"]);
    return res === "PONG";
  },

  /**
   * Get a parsed JSON value or string from Redis
   */
  async get<T = any>(key: string): Promise<T | null> {
    const raw = await executeCommand<string>(["GET", key]);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  },

  /**
   * Set a key-value pair with optional TTL (ex in seconds)
   */
  async set(key: string, value: any, options?: SetOptions): Promise<boolean> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const cmd: (string | number)[] = ["SET", key, serialized];

    if (options?.ex && options.ex > 0) {
      cmd.push("EX", Math.floor(options.ex));
    }
    if (options?.nx) {
      cmd.push("NX");
    }

    const res = await executeCommand<string>(cmd);
    return res === "OK";
  },

  /**
   * Delete a key
   */
  async del(key: string): Promise<boolean> {
    const res = await executeCommand<number>(["DEL", key]);
    return typeof res === "number" && res > 0;
  },

  /**
   * Increment an integer value atomically
   */
  async incr(key: string): Promise<number | null> {
    return executeCommand<number>(["INCR", key]);
  },

  /**
   * Set expiration in seconds on an existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const res = await executeCommand<number>(["EXPIRE", key, Math.floor(seconds)]);
    return res === 1;
  },

  /**
   * Run a batch of commands atomically in a single network round-trip via pipeline
   */
  async pipeline(commands: (string | number)[][]): Promise<any[]> {
    const { url, token, isConfigured } = getCredentials();
    if (!isConfigured || !url || !token || commands.length === 0) return [];

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        return [];
      }

      const results = await res.json();
      return Array.isArray(results) ? results.map((r) => r?.result) : [];
    } catch {
      return [];
    }
  },
};

export default redis;
