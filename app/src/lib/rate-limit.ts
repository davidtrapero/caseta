type BucketEntry = { count: number; resetAt: number };

// In-memory store — resets per serverless instance. Aceptable para volumen de feria.
const store = new Map<string, BucketEntry>();

export function checkRateLimit(
  ip: string,
  bucket: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}
