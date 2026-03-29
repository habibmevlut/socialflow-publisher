import { URL } from "node:url";

/** BullMQ / ioredis uyumlu bağlantı. Railway: REDIS_URL; yerel: REDIS_HOST + REDIS_PORT. */
export function getBullmqConnection(): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    try {
      const u = new URL(redisUrl);
      const username = u.username && u.username.length > 0 ? decodeURIComponent(u.username) : undefined;
      const password = u.password && u.password.length > 0 ? decodeURIComponent(u.password) : undefined;
      return {
        host: u.hostname,
        port: u.port ? Number(u.port) : 6379,
        ...(username && username !== "default" ? { username } : {}),
        ...(password ? { password } : {})
      };
    } catch {
      /* fall through */
    }
  }
  const password = process.env.REDIS_PASSWORD?.trim();
  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
    ...(password ? { password } : {})
  };
}
