# bstage

One Liara container, with Nginx serving the dashboard on port 80 and proxying
configured applications on their own internal ports.

## Runtime

- `/` and `/index.html`: Nginx serves the generated dashboard independently of child app availability.
- `/creator/`: Nginx proxies the complete path to content-creator on port 3001.
- `launcher.mjs`: reads `apps/*/app.json`, generates Nginx routes and dashboard links, starts Nginx and supervises app processes.
- `liara.json`: port 80 and existing persistent disk mounts. No custom health command.
- Child environment variables come only from the explicit per-app allowlist and prefix.
- Child exits trigger a restart after two seconds. Container shutdown stops Nginx and children.

The image uses Debian Nginx and the Node 22 binary from the matching Debian Node
image. App dependencies travel in an archive because Liara's uploader excludes
node_modules. Docker extracts that archive and restores ffmpeg permissions.

## Deploy

Edit `deploy.lock.json` to choose release versions. Push from your terminal,
then use Actions > deploy > Run workflow > main. There are no app/version inputs.
The workflow downloads all pinned releases, verifies checksums, packages them,
and deploys on port 80. It does not commit or push version changes.

Deploying restarts all apps in this shared container. The existing creator disk
is mounted at /data/creator. No app data or secrets belong in the source archive.

## Adding an app

1. Add apps/<name>/app.json with source_repo, artifact, route, port, data_dir, disk,
   entry, env_prefix, env_allowlist, and strip_prefix.
2. Add the pinned version to deploy.lock.json and its persistent disk mount to liara.json.
3. Deploy manually. A dashboard link and Nginx route are generated automatically.

Routes use a path such as /creator. With strip_prefix:false, the full path is
forwarded; otherwise the route prefix is stripped. App route and port must be unique.

## Rollback

The known-working static-only implementation is commit eb0c02c. Restore its
Dockerfile, index.html, liara.json and .github/workflows/deploy.yml in a new commit
and deploy it to return to the standalone Nginx page. Persistent app data remains
on the existing disk.
