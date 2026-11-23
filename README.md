# bstage

One Liara app that hosts several apps behind path prefixes. Deploy pipeline for
content-creator today, more apps later.

## Shape

- `launcher.mjs` — gateway on 8080 plus a supervisor. Each `apps/<name>/` with an
  `app.json` becomes a child process on its own port with its own `BASE_URL`,
  `DATA_DIR` and disk.
- `Dockerfile` — one image for all apps.
- `liara.json` — the `bstage` app: port 8080, one disk per hosted app, health
  check runs `launcher.mjs health`.
- `deploy.lock.json` — the version of each app that goes into the image.

Deploying anything rebuilds the whole image and restarts every app. Accepted for
staging.

## Adding an app

1. `apps/<name>/app.json`:
   ```json
   { "source_repo": "owner/repo", "artifact": "name-*",
     "route": "/name", "port": 3002, "data_dir": "/data/name",
     "disk": "name", "entry": "server.js", "health": "/api/health" }
   ```
2. Add its disk to `liara.json` (`{ "name": "name", "mountTo": "/data/name" }`).
3. In that app's repo, dispatch `app-release` with `{app, version}` after a
   release, using a fine-grained PAT with `Contents: read and write` on this repo.

The image only contains what the lock file pins — a new app needs one entry in
`deploy.lock.json` to start being built in.

## Triggering

- automatic: `repository_dispatch`, event `app-release`, payload `{app, version}`
- manual: Actions → deploy → Run workflow → app + version
