import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('./game', import.meta.url));
const types: Record<string,string> = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
const port = Number(process.env.PORT || 8080);
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) throw Error('Outside game directory');
    const bytes = await readFile(file);
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-cache');
    response.end(bytes);
  } catch {
    response.writeHead(404).end('Street closed');
  }
}).listen(port, '127.0.0.1', () => console.log('Solmara at http://127.0.0.1:' + port));
