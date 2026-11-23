# devops-stage

Deployment pipeline for **content-creator** only. Nothing else belongs in this repo.

## What it does

`.github/workflows/content-creator.yml` reacts to a release published in
`bonshad2026/content-creator`:

1. starts from either a `repository_dispatch` (`content-creator-release`) or a manual run
2. downloads `content-creator-<version>.tar.gz`, `.sha256` and `.manifest.json`
3. verifies the checksum file, then cross-checks it against the manifest
4. extracts the build and confirms the runtime is present
5. starts the app and calls `/api/health`

It stops there. Nothing is deployed yet.

## Enabling the automatic trigger

In `bonshad2026/content-creator`, add a secret named `DEVOPS_DISPATCH_TOKEN`:

- a **fine-grained** personal access token
- `Contents: read and write`, scoped to this `devops-stage` repo only

Until that secret exists, the app repo's `Notify dev-ops` step prints a skip
message and exits cleanly.

## Not done yet

Deploying. content-creator has no staging slot until it is decided whether it
runs as a fifth process inside the `tibasoft` container or as its own Liara app
— the memory headroom of the current Earth plan is unproven.
