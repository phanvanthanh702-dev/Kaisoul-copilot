import pg from "pg";

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL chưa được cấu hình trong .env"
  );
}

export const pool = new Pool({
  connectionString: DATABASE_URL,

  max: 10,

  idleTimeoutMillis: 30000,

  connectionTimeoutMillis: 10000,

  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false
        }
      : false
});


pool.on("error", (error) => {
  console.error(
    "PostgreSQL pool error:",
    error
  );
});


export async function query(
  text,
  params = []
) {
  return pool.query(
    text,
    params
  );
}


export async function getClient() {
  return pool.connect();
}


export async function testDatabase() {

  const result = await query(
    "SELECT NOW() AS now"
  );

  return result.rows[0];

}
