#!/usr/bin/env node
import { spawn, execSync } from 'child_process';

// 🚀 Start the server IMMEDIATELY so Render binds the port
console.log('🚀 Starting server process...');
const server = spawn('node', ['dist/index.cjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

async function runMigrations() {
  if (!process.env.DATABASE_URL) return;

  console.log('🔄 Checking database schema...');
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      console.log(`📡 Migration attempt ${attempts + 1}/${maxAttempts}...`);
      
      // Use yes | to pipe 'y' to any prompts
      // Use --url to provide connection string explicitly
      execSync(`yes | npx drizzle-kit push --dialect=postgresql --schema=shared/schema.ts --url="${process.env.DATABASE_URL}" --force`, {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      console.log('✅ Database schema is up to date');
      break;
    } catch (error) {
      attempts++;
      console.error(`⚠️  Migration attempt ${attempts} failed. Error:`, error.message);
      if (attempts < maxAttempts) {
        console.log('⏳ Retrying in 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('❌ All migration attempts failed. Please check your DATABASE_URL and database status.');
      }
    }
  }
}

// Start migrations in the background after a short delay to let the server bind
setTimeout(runMigrations, 3000);

server.on('close', (code) => {
  process.exit(code);
});


