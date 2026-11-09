import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

// Local Docker database only. This script never runs against a remote or
// production database, whatever the environment says.
if (!process.env.DATABASE_URL) {
  const envFile = join(process.cwd(), ".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
const connectionString = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  throw new Error("db:migrate runs against the local Docker database only (localhost).");
}
const pool = new Pool({ connectionString });

async function main() {
  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_relations_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const existing = await pool.query(
      `SELECT 1 FROM employee_relations_schema_migrations WHERE id = $1`,
      [file],
    );
    if (existing.rowCount) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = readFileSync(join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO employee_relations_schema_migrations (id) VALUES ($1)`, [
        file,
      ]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
