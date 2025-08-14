#!/usr/bin/env node
/*
  Helper to build and serve the static site with retries before Playwright attaches.
  - Builds once
  - Starts a static server
  - Polls URL until healthy with exponential backoff (up to ~60s)
*/
const { spawn } = require('node:child_process');
const http = require('node:http');

const URL_TO_WAIT = process.env.PW_BASE_URL || 'http://localhost:3010';

function waitForServer(url, maxAttempts = 8) {
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
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
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

  // Start server
  const serveProc = spawn('pnpm', ['dlx', 'serve', '-l', '3010', 'out'], {
    stdio: 'inherit',
    shell: true,
  });

  // Let Playwright kill this when done; otherwise handle parent exit
  process.on('SIGTERM', () => serveProc.kill('SIGTERM'));
  process.on('SIGINT', () => serveProc.kill('SIGINT'));
  process.on('exit', () => serveProc.kill());

  // Wait until the server is ready before returning control to Playwright
  await waitForServer(URL_TO_WAIT);

  // Keep this wrapper process alive so Playwright can manage it and send signals
  await new Promise(() => {});
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


