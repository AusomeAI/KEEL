/**
 * Database Migration Runner
 *
 * Applies pending migrations to the PostgreSQL database.
 * Usage: node src/db/migrate.ts
 */

import { initializeDatabase, closeDatabase } from './client.js';

async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');
    await initializeDatabase();
    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runMigrations();
