# CivitasWatch API

## Verification

Use `node --check <file>` for API route syntax verification, for example:

```bash
node --check apps/api/src/routes/patrol-events.routes.js
```

`apps/api` currently has no `build` script. Do not use `npm run build --workspace apps/api` as a verification step unless a build script is added later.

Web verification remains:

```bash
npm run build --workspace apps/web
```
