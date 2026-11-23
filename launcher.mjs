// Nginx serves HTTP on port 80; this process supervises the configured apps.
import { spawn } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const apps = [];
for (const name of await readdir(join(root, 'apps'))) {
  const configPath = join(root, 'apps', name, 'app.json');
  let config;
  try { config = JSON.parse(await readFile(configPath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(config.route)
      || !Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) {
    throw Error('Invalid route or port for ' + name);
  }
  if (apps.some(app => app.port === config.port || app.route === config.route)) throw Error('Duplicate route or port: ' + name);
  apps.push({ ...config, name, dir: join(root, 'apps', name, 'app') });
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const template = await readFile(join(root, 'index.html'), 'utf8');
const cards = apps.map(app => '<a class="card" href="' + escapeHtml(app.route + '/') + '"><h2>' + escapeHtml(app.title || app.name.replace(/-/g, ' ')) + '</h2><code>' + escapeHtml(app.route + '/') + '</code><span class="open">Open application</span></a>').join('\n');
await writeFile('/usr/share/nginx/html/index.html', template.replace('<!-- APP_LINKS -->', cards));
const locations = apps.map(app => `
  location = ${app.route} { return 308 ${app.route}/; }
  location ^~ ${app.route}/ {
    proxy_pass http://127.0.0.1:${app.port}${app.strip_prefix === false ? '' : '/'};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 300s;
  }`).join('\n');
await writeFile('/etc/nginx/conf.d/default.conf', `server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ =404; }
${locations}
}\n`);

const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => { for (const child of children) child.kill('SIGKILL'); process.exit(code); }, 5000).unref();
}
function runApp(app) {
  if (stopping) return;
  const env = { PATH: process.env.PATH, HOME: app.data_dir, TMPDIR: '/tmp', NODE_ENV: 'production', PORT: String(app.port), BASE_URL: app.route, DATA_DIR: app.data_dir };
  for (const key of app.env_allowlist || []) {
    const value = process.env[(app.env_prefix || '') + key];
    if (value !== undefined) env[key] = value;
  }
  const child = spawn(process.execPath, [app.entry || 'server.js'], { cwd: app.dir, env, stdio: 'inherit' });
  children.add(child);
  child.on('error', error => console.error('[' + app.name + '] spawn failed: ' + error.code));
  child.on('close', () => { children.delete(child); if (!stopping) setTimeout(() => runApp(app), 2000); });
}
const nginx = spawn('/usr/sbin/nginx', ['-g', 'daemon off;'], { stdio: 'inherit' });
children.add(nginx);
nginx.on('error', error => { console.error('Nginx failed: ' + error.code); stop(1); });
nginx.on('exit', () => { children.delete(nginx); if (!stopping) stop(1); });
for (const app of apps) runApp(app);
process.on('SIGTERM', () => stop());
process.on('SIGINT', () => stop());
