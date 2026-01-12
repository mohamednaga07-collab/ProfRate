#!/usr/bin/env node
import { spawn } from 'child_process';
import { promisify } from 'util';

// 🚀 Start the server IMMEDIATELY so Render sees an open port
console.log('🚀 Starting server process...');
const server = spawn('node', ['dist/index.cjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

// 🔄 Run migrations in the background
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL - skipping migrations');
    return;
  }

  console.log('🔄 Triggering background database migrations...');
  const migrate = spawn('npx', ['drizzle-kit', 'push', '--force'], {
    stdio: 'inherit'
  });

  migrate.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Database schema verified/updated');
    } else {
      console.error(`⚠️  Migration finished with code ${code}`);
    }
  });
}

// Run migrations while server is starting
runMigrations();

server.on('close', (code) => {
  process.exit(code);
});

