// Minimal bstage connectivity test. Original launcher is preserved below.
import http from 'node:http';

const PORT = 8080;

if (process.argv[2] === 'health') {
  try {
    const response = await fetch('http://127.0.0.1:8080/', { signal: AbortSignal.timeout(2000) });
    await response.body?.cancel();
    process.exit(response.ok ? 0 : 1);
  } catch {
    process.exit(1);
  }
}

http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>bstage</title><h1>Hello World</h1><p>bstage is serving requests.</p></html>');
}).listen(PORT, '0.0.0.0', () => console.log('Hello World server listening on 0.0.0.0:8080'));

// ---- Original launcher (temporarily disabled) ----
// // Gateway + process supervisor for the bstage container.
// //
// // Every directory under apps/ with an app.json becomes a child process on its
// // own port, with its own BASE_URL, DATA_DIR and disk. The gateway strips the
// // route prefix and forwards to that child.
// //
// //   node launcher.mjs          start everything and listen on 8080
// //   node launcher.mjs health   exit 0 only if every child answers its health path
//
// import { spawn } from 'node:child_process';
// import { readdir, readFile } from 'node:fs/promises';
// import http from 'node:http';
// import { dirname, join } from 'node:path';
// import { fileURLToPath } from 'node:url';
//
// const ROOT = dirname(fileURLToPath(import.meta.url));
// const PORT = Number(process.env.PORT || 8080);
//
// async function loadApps() {
//   const apps = [];
//   for (const name of await readdir(join(ROOT, 'apps'))) {
//     try {
//       const cfg = JSON.parse(await readFile(join(ROOT, 'apps', name, 'app.json'), 'utf8'));
//       apps.push({ name, ...cfg, dir: join(ROOT, 'apps', name, 'app') });
//     } catch {
//       // no app.json here: not an app
//     }
//   }
//   return apps.sort((a, b) => a.port - b.port);
// }
//
// function start(app) {
//   const child = spawn(process.execPath, [app.entry || 'server.js'], {
//     cwd: app.dir,
//     env: {
//       PATH: process.env.PATH,
//       HOME: app.data_dir,
//       TMPDIR: '/tmp',
//       ...Object.fromEntries((app.env_allowlist || []).filter(key => process.env[(app.env_prefix || '') + key] !== undefined).map(key => [key, process.env[(app.env_prefix || '') + key]])),
//       PORT: String(app.port),
//       BASE_URL: app.route,
//       DATA_DIR: app.data_dir,
//       NODE_ENV: 'production',
//     },
//     stdio: ['ignore', 'inherit', 'inherit'],
//   });
//   child.on('exit', (code, signal) => {
//     console.error(`[${app.name}] exited (${code ?? signal}); restarting in 2s`);
//     setTimeout(() => start(app), 2000);
//   });
//   return child;
// }
//
// async function isUp(url) {
//   try {
//     const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
//     return res.ok;
//   } catch {
//     return false;
//   }
// }
//
// const apps = await loadApps();
// if (!apps.length) {
//   console.error('no apps found under apps/');
//   process.exit(1);
// }
//
// if (process.argv[2] === 'health') {
//   // Liara caps startPeriod at 3000ms, so give slow children a short grace window
//   // here instead: poll until everything answers, or until the check's timeout.
//   const deadline = Date.now() + 6000;
//   let results = [];
//   do {
//     results = await Promise.all(
//       apps.map(async (app) => ({
//         app: app.name,
//         up: await isUp(`http://127.0.0.1:${app.port}${app.health || '/'}`),
//       })),
//     );
//     if (results.every((r) => r.up)) break;
//     await new Promise((resolve) => setTimeout(resolve, 500));
//   } while (Date.now() < deadline);
//   console.log(JSON.stringify(results));
//   process.exit(results.every((r) => r.up) ? 0 : 1);
// }
//
// const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// const dashboardTemplate = await readFile(join(ROOT, 'index.html'), 'utf8');
// const dashboard = dashboardTemplate.replace('<!-- APP_LINKS -->', apps.map(app => {
//   const route = app.route.replace(/\/+$/, '') + '/';
//   const label = app.title || app.name.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
//   return '<a class="card" href="' + escapeHtml(route) + '"><h2>' + escapeHtml(label) + '</h2><code>' + escapeHtml(route) + '</code><span class="open">Open application</span></a>';
// }).join('\n'));
//
// for (const app of apps) start(app);
//
// http
//   .createServer((req, res) => {
//     const url = new URL(req.url, 'http://localhost');
//     if (url.pathname === '/' || url.pathname === '/index.html') {
//       if (req.method !== 'GET' && req.method !== 'HEAD') {
//         res.writeHead(405, { allow: 'GET, HEAD' }).end();
//         return;
//       }
//       res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
//       res.end(req.method === 'HEAD' ? undefined : dashboard);
//       return;
//     }
//     const app = apps
//       .filter((a) => url.pathname === a.route || url.pathname.startsWith(`${a.route}/`))
//       .sort((a, b) => b.route.length - a.route.length)[0];
//
//     if (!app) {
//       res.writeHead(404, { 'content-type': 'text/plain' }).end('no app at this path');
//       return;
//     }
//
//     const upstream = http.request(
//       {
//         host: '127.0.0.1',
//         port: app.port,
//         path: app.strip_prefix === false ? url.pathname + url.search : (url.pathname.slice(app.route.length) || '/') + url.search,
//         method: req.method,
//         headers: req.headers,
//       },
//       (answer) => {
//         const headers = { ...answer.headers };
//         const streaming = String(headers['content-type'] || '').includes('text/event-stream');
//         if (streaming) {
//           // SSE: never let a proxy buffer or cache the stream
//           headers['cache-control'] = headers['cache-control'] || 'no-cache';
//           headers['x-accel-buffering'] = 'no';
//           headers.connection = 'keep-alive';
//         }
//         res.writeHead(answer.statusCode, headers);
//         res.flushHeaders?.();
//         answer.pipe(res);
//       },
//     );
//
//     upstream.setNoDelay(true);
//     req.socket.setNoDelay(true);
//     // a client that walks away must not leave the upstream connection open
//     req.on('aborted', () => upstream.destroy());
//     upstream.on('error', () => {
//       if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
//       res.end('upstream down');
//     });
//     req.pipe(upstream);
//   })
//   .listen(PORT, "0.0.0.0", () => {
//     console.log(`gateway on ${PORT}: ` + apps.map((a) => `${a.route || '/'} -> ${a.name}:${a.port}`).join(', '));
//   });
//