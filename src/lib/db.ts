import { Pool, types, type PoolConfig, type QueryResultRow } from "pg";

/*
  Postgres connection, configured only from DATABASE_URL.

  - Local: the Docker database (localhost / 127.0.0.1), no SSL.
  - Production (Vercel): the production connection string; SSL is switched on
    automatically for any non-local host.
  - Safety: during local development a remote database is refused unless
    ALLOW_REMOTE_DB=true, so `next dev` can never write to production by accident.
*/

// DATE columns come back as plain 'YYYY-MM-DD' strings instead of JS Dates,
// so no timezone can shift a meeting or target date by a day.
types.setTypeParser(1082, (value: string) => value);

declare global {
  var __erPool: Pool | undefined;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "db"]);

export function isLocalDatabase(connectionString: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(connectionString).hostname);
  } catch {
    return false;
  }
}

export function poolConfig(connectionString = process.env.DATABASE_URL): PoolConfig {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const local = isLocalDatabase(connectionString);
  if (
    !local &&
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_REMOTE_DB !== "true"
  ) {
    throw new Error(
      "DATABASE_URL points at a remote database while running locally. " +
        "Set ALLOW_REMOTE_DB=true if you really mean to use it.",
    );
  }

  const sslOff = /sslmode=disable/i.test(connectionString) || process.env.DATABASE_SSL === "false";
  return {
    connectionString,
    ssl: local || sslOff ? undefined : { rejectUnauthorized: false },
    // Serverless functions each hold their own pool: keep it small.
    max: Number(process.env.DATABASE_POOL_MAX ?? (process.env.VERCEL ? 3 : 10)),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  };
}

function createPool() {
  return new Pool(poolConfig());
}

export const pool = globalThis.__erPool ?? createPool();
globalThis.__erPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  fn: (client: {
    query: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ) => Promise<{ rows: R[]; rowCount: number | null }>;
  }) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** A DATE column ('YYYY-MM-DD' string) or a timestamp, as 'YYYY-MM-DD'. */
export function isoDate(value: string | Date | null): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}
