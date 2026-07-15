import { pool } from "@/lib/db";
import {
  CONTENT_KEY_MAP,
  DEFAULT_SITE_CONTENT,
  type SiteContent,
} from "@/lib/content";

// Server-only: touches the DB, so this must never be imported from a client
// component (use lib/content.ts for types/constants there instead).
export async function getSiteContent(): Promise<SiteContent> {
  try {
    const [rows]: any = await pool.query(
      `SELECT ContentKey, ContentValue FROM SiteContent WHERE ContentKey IN (?)`,
      [Object.values(CONTENT_KEY_MAP)],
    );

    const result: SiteContent = structuredClone(DEFAULT_SITE_CONTENT);
    for (const row of rows) {
      const section = (Object.keys(CONTENT_KEY_MAP) as (keyof SiteContent)[]).find(
        (key) => CONTENT_KEY_MAP[key] === row.ContentKey,
      );
      if (!section) continue;
      // MariaDB's JSON type is a LONGTEXT alias, so mysql2 returns a raw
      // string here rather than auto-parsing it — see migration 005's note.
      const value =
        typeof row.ContentValue === "string"
          ? JSON.parse(row.ContentValue)
          : row.ContentValue;
      (result as any)[section] = value;
    }
    return result;
  } catch (err) {
    console.error("getSiteContent failed, using defaults", err);
    return structuredClone(DEFAULT_SITE_CONTENT);
  }
}
