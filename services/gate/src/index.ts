/**
 * KEEL Control Gate Microservice
 *
 * Implements the 9-step transaction boundary between the Agent Plane
 * and the Deterministic Core (packages/core).
 *
 * Acts as the only write path into the event ledger, enforcing all 10 Laws.
 * - Law 2: Manual UI routes registered before agent capability
 * - Law 5: Tenant isolation via PostgreSQL RLS
 * - Law 7: Decision Records signed and persisted
 * - Law 9: Autonomy ceilings enforced at compile-time
 * - Law 10: Per-agent identity with scoped tokens
 */

import Fastify from 'fastify';
import { initializeDatabase, closeDatabase } from './db/client.js';
import { registerGateRoutes } from './routes/gate.js';

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

async function startServer(): Promise<void> {
  try {
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();

    // Create Fastify instance
    const app = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      },
    });

    // Register routes
    console.log('🚀 Registering Control Gate routes...');
    await registerGateRoutes(app);

    // Health check endpoint
    app.get('/health', async (request, reply) => {
      return { status: 'ok', service: 'control-gate' };
    });

    // Readiness check endpoint
    app.get('/ready', async (request, reply) => {
      return { ready: true, service: 'control-gate' };
    });

    // Start server
    await app.listen({ port: PORT, host: HOST });

    console.log(`✅ Control Gate running on http://${HOST}:${PORT}`);
    console.log('📋 API Endpoints:');
    console.log('  POST   /api/gate/submit     - Submit TransactionIntent');
    console.log('  GET    /api/gate/pending    - List pending approvals');
    console.log('  POST   /api/gate/approve/:id - Approve transaction');
    console.log('  POST   /api/gate/reject/:id  - Reject transaction');
    console.log('  GET    /health              - Health check');
    console.log('  GET    /ready               - Readiness check');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('⏹️  Shutting down gracefully...');
      await app.close();
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('⏹️  Shutting down gracefully...');
      await app.close();
      await closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await closeDatabase();
    process.exit(1);
  }
}

startServer();
