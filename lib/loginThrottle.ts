import net from "net";
import tls from "tls";
import db from "@/lib/db";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const REDIS_TIMEOUT_MS = 1500;

function encodeRedisCommand(parts: string[]) {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join("")}`;
}

function parseRedisInteger(response: string) {
  if (!response.startsWith(":")) {
    throw new Error(`Unexpected Redis response: ${response.slice(0, 20)}`);
  }

  return Number(response.slice(1).split("\r\n")[0]);
}

async function redisCommand(parts: string[]) {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) return null;

  return new Promise<string>((resolve, reject) => {
    const parsed = new URL(redisUrl);
    const socketOptions = {
      host: parsed.hostname,
      port: Number(parsed.port || (parsed.protocol === "rediss:" ? 6380 : 6379)),
    };

    const socket =
      parsed.protocol === "rediss:"
        ? tls.connect(socketOptions)
        : net.connect(socketOptions);

    let buffer = "";
    let settled = false;
    let authenticated = !parsed.password;

    function finish(error?: Error, value?: string) {
      if (settled) return;
      settled = true;
      socket.destroy();

      if (error) {
        reject(error);
      } else {
        resolve(value || "");
      }
    }

    socket.setTimeout(REDIS_TIMEOUT_MS);
    socket.on("timeout", () => finish(new Error("Redis command timed out")));
    socket.on("error", finish);
    function writeCommand(commandParts: string[]) {
      socket.write(encodeRedisCommand(commandParts));
    }

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      if (buffer.includes("\r\n")) {
        if (!authenticated) {
          if (buffer.startsWith("-")) {
            finish(new Error(`Redis AUTH failed: ${buffer.slice(0, 80)}`));
            return;
          }

          authenticated = true;
          buffer = "";
          writeCommand(parts);
          return;
        }

        finish(undefined, buffer);
      }
    });
    socket.on("connect", () => {
      if (parsed.password) {
        if (parsed.username) {
          writeCommand([
            "AUTH",
            decodeURIComponent(parsed.username),
            decodeURIComponent(parsed.password),
          ]);
        } else {
          writeCommand(["AUTH", decodeURIComponent(parsed.password)]);
        }
        return;
      }

      writeCommand(parts);
    });
  });
}

async function isRateLimitedByRedis(key: string) {
  const redisKey = `login_attempts:${key}`;
  const response = await redisCommand(["INCR", redisKey]);

  if (response === null) return null;

  const count = parseRedisInteger(response);

  if (count === 1) {
    await redisCommand(["PEXPIRE", redisKey, String(LOGIN_WINDOW_MS)]);
  }

  return count > MAX_LOGIN_ATTEMPTS;
}

async function clearRedisAttempts(key: string) {
  const redisKey = `login_attempts:${key}`;
  await redisCommand(["DEL", redisKey]);
}

async function isRateLimitedByPostgres(key: string) {
  const result = await db.query(
    `
    INSERT INTO login_attempts (attempt_key, attempt_count, reset_at, updated_at)
    VALUES (
      $1,
      1,
      NOW() + ($2::integer * INTERVAL '1 millisecond'),
      NOW()
    )
    ON CONFLICT (attempt_key)
    DO UPDATE SET
      attempt_count = CASE
        WHEN login_attempts.reset_at <= NOW() THEN 1
        ELSE login_attempts.attempt_count + 1
      END,
      reset_at = CASE
        WHEN login_attempts.reset_at <= NOW()
          THEN NOW() + ($2::integer * INTERVAL '1 millisecond')
        ELSE login_attempts.reset_at
      END,
      updated_at = NOW()
    RETURNING attempt_count
    `,
    [key, LOGIN_WINDOW_MS]
  );

  return Number(result.rows[0]?.attempt_count || 0) > MAX_LOGIN_ATTEMPTS;
}

async function clearPostgresAttempts(key: string) {
  await db.query("DELETE FROM login_attempts WHERE attempt_key = $1", [key]);
}

export async function isRateLimited(key: string) {
  try {
    const limited = await isRateLimitedByRedis(key);
    if (limited !== null) return limited;
  } catch (error) {
    console.error("REDIS LOGIN THROTTLE ERROR:", error);
  }

  return isRateLimitedByPostgres(key);
}

export async function clearLoginAttempts(key: string) {
  try {
    if (process.env.REDIS_URL) {
      await clearRedisAttempts(key);
      return;
    }
  } catch (error) {
    console.error("REDIS LOGIN THROTTLE CLEAR ERROR:", error);
  }

  await clearPostgresAttempts(key);
}
