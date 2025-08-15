#!/usr/bin/env node
/*
  Build the Next.js app and start a production server on the given port (default 3010).
  Waits for the server to be reachable before returning control to Playwright.
*/
const { spawn } = require('node:child_process');
const http = require('node:http');

const PORT = process.env.PW_PORT || '3010';
const URL = `http://localhost:${PORT}`;

function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryOnce = () => {
      attempt += 1;
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          res.resume();
          resolve(true);
        } else {
          res.resume();
          retry();
        }
      });
      req.on('error', retry);
      function retry() {
        if (attempt >= maxAttempts) return reject(new Error('Server did not become ready in time'));
        const delayMs = Math.min(1000 * attempt, 5000);
        setTimeout(tryOnce, delayMs);
      }
    };
    tryOnce();
  });
}

async function run() {
  // Build once
  await new Promise((resolve, reject) => {
    const p = spawn('pnpm', ['build:web'], { stdio: 'inherit', shell: true });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('build:web failed'))));
  });

  // Start next in production
  const proc = spawn('node', ['node_modules/.bin/next', 'start', '-p', PORT], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  process.on('SIGTERM', () => proc.kill('SIGTERM'));
  process.on('SIGINT', () => proc.kill('SIGINT'));
  process.on('exit', () => proc.kill());

  await waitForServer(URL);

  // Keep alive for Playwright to manage
  await new Promise(() => {});
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


