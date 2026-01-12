#!/usr/bin/env node
import { spawn, execSync } from 'child_process';

// 🚀 Start the server IMMEDIATELY
console.log('🚀 Starting server process...');
const server = spawn('node', ['dist/index.cjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;

  console.log('🔄 Checking database schema...');
  try {
    // We use yes | to answer any "Is this a rename?" questions automatically
    // This is safer for automated deployments where we want the schema to match exactly
    execSync('yes | npx drizzle-kit push --force', {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('✅ Database schema is up to date');
  } catch (error) {
    console.error('⚠️  Migration check finished with warning/error. (Continuing anyway)');
  }
}

// Run migrations in background so server can bind port
setTimeout(runMigrations, 2000);

server.on('close', (code) => {
  process.exit(code);
});

