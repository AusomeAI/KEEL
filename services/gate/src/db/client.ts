/**
 * PostgreSQL Database Client
 *
 * Manages connections to the bitemporal ledger database.
 * Initializes schema on startup.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'keel_ledger',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true',
    });
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  const pool = getPool();

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../../migrations/001-create-bitemporal-ledger.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Check if schema already exists
    const result = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'ledger_events'
      )`
    );

    if (!result.rows[0].exists) {
      console.log('Initializing database schema...');
      await pool.query(migrationSQL);
      console.log('✓ Database schema initialized');
    } else {
      console.log('✓ Database schema already initialized');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

/**
 * Execute a query with tenant isolation context
 * Sets keel.tenant_id for RLS enforcement
 */
export async function queryWithTenantContext(
  sql: string,
  params: any[],
  tenantId: string
): Promise<pg.QueryResult<any>> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Set tenant context for RLS
    await client.query(`SET keel.tenant_id = $1`, [tenantId]);

    // Execute query
    const result = await client.query(sql, params);

    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction with tenant context
 */
export async function transactionWithTenantContext<T>(
  tenantId: string,
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set tenant context for RLS
    await client.query(`SET keel.tenant_id = $1`, [tenantId]);

    // Execute callback
    const result = await callback(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
