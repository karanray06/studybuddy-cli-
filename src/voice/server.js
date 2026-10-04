import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { colors, sym } from '../ui/theme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAGE_PATH = join(__dirname, 'page.html');

/**
 * Start a tiny HTTP server for voice input.
 * Opens the browser to the companion page with Web Speech API.
 * Returns a promise that resolves with the spoken text.
 */
export function captureVoice(timeoutMs = 300_000) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const server = createServer((req, res) => {
      // CORS headers for the companion page
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url === '/') {
        // Serve the companion page
        const html = readFileSync(PAGE_PATH, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (req.method === 'POST' && req.url === '/transcript') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { text } = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));

            if (!resolved && text) {
              resolved = true;
              cleanup();
              resolve(text);
            }
          } catch {
            res.writeHead(400);
            res.end('Bad request');
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = `http://localhost:${port}/?port=${port}`;

      console.log('');
      console.log(
        `  ${sym.mic} ${colors.secondary('Voice input ready!')} ` +
        `Opening browser...`
      );
      console.log(`  ${colors.muted(url)}`);
      console.log(
        colors.dim('  Speak your notes in the browser, then click "Send to StudyBuddy".')
      );
      console.log('');

      // Open the browser
      openBrowser(url);
    });

    // Timeout
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Voice input timed out (5 minutes).'));
      }
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      server.close();
    }

    server.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(err);
      }
    });
  });
}

/**
 * Open a URL in the default browser.
 */
function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      console.log(colors.warning(`  Could not open browser. Please visit: ${url}`));
    }
  });
}
