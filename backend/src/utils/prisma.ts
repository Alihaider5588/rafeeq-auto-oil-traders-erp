import { PrismaClient as SqliteClient } from '@prisma/client';

const isPostgresRequested = process.env.NODE_ENV !== 'test' && process.env.USE_POSTGRES === 'true';

let prismaInstance: any;

if (isPostgresRequested) {
  const neonUrl = process.env.NEON_DATABASE_URL;

  if (!neonUrl || neonUrl.trim() === '') {
    console.error('================================================================');
    console.error('FATAL CONFIG ERROR: USE_POSTGRES=true is set, but NEON_DATABASE_URL is missing or empty.');
    console.error('Terminating backend process to prevent unintended database operations.');
    console.error('================================================================');
    process.exit(1);
  }

  try {
    let connectionUrl = neonUrl.trim();
    if (connectionUrl.includes('-pooler.') && !connectionUrl.includes('pgbouncer=true')) {
      const sep = connectionUrl.includes('?') ? '&' : '?';
      connectionUrl = `${connectionUrl}${sep}pgbouncer=true&connection_limit=10&connect_timeout=15`;
    }

    const { PrismaClient: PostgresClient } = require('@prisma/client-postgres');
    prismaInstance = new PostgresClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: ['error', 'warn'],
    });

    console.log('[Database] Configured in POSTGRESQL mode (Neon Production, Pooled).');
  } catch (err: any) {
    console.error('================================================================');
    console.error('FATAL ERROR: Failed to load PostgreSQL Prisma Client (@prisma/client-postgres):', err?.message || 'Unknown error');
    console.error('Terminating backend process. Silently falling back to SQLite is strictly forbidden.');
    console.error('================================================================');
    process.exit(1);
  }
} else {
  prismaInstance = new SqliteClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  console.log('[Database] Configured in SQLITE mode (Local dev.db).');
}

/**
 * Ensures the database is reachable before the HTTP server starts listening.
 * In PostgreSQL mode, this validates network, credentials, and SSL at startup.
 */
export async function assertDatabaseConnection(): Promise<void> {
  try {
    await prismaInstance.$connect();
    if (isPostgresRequested) {
      console.log('[Database] Connection verified: PostgreSQL database is connected and ready.');
    }
  } catch (err: any) {
    console.error('================================================================');
    console.error('FATAL ERROR: Database connection failed during startup initialization.');
    console.error('ERROR_CODE:', err?.code || 'CONNECTION_FAILED');
    console.error('ERROR_MESSAGE:', err?.message?.split('\n')[0] || 'Unable to connect to database.');
    console.error('Terminating backend process.');
    console.error('================================================================');
    process.exit(1);
  }
}

export const prisma: SqliteClient = prismaInstance;
export default prisma;

