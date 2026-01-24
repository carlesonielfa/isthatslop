import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export const db = drizzle(process.env.DATABASE_URL!, { schema });

// Re-export all schema tables and relations
export * from './schema.js';
