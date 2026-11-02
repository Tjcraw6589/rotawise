// Minimal static file server for a folder (the landing site).
// Usage: node scripts/serve-dir.mjs <folder> [port]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'site/dist');
const port = Number(process.argv[3] ?? 4180);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript' };

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  // Serve as if the site lives at /rotawise/ (GitHub Pages) or at the root.
  let path = normalize(decodeURIComponent(url.pathname.replace(/^\/rotawise(\/|$)/, '/'))).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
