import mysql from "mysql2/promise";

const globalDb = globalThis as unknown as { pool: mysql.Pool };

export const pool =
  globalDb.pool ||
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
  });

if (process.env.NODE_ENV !== "production") globalDb.pool = pool;

// Runs fn inside a transaction on a dedicated connection, committing on
// success and rolling back on any thrown error. The connection is always
// released, and the same conn must be passed to any query fn issues so all
// reads/writes participate in the one transaction.
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
