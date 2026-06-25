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
