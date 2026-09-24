# cliqhub-bff

CliqHub BFF — session cookies, CSRF, proxies `/v1` to Core, serves the SPA from `/app/spa`.

The Docker image clones **[cliqhub-frontend](https://github.com/getcliqio/cliqhub-frontend)** at build time.

## Railway

- Root: this repo
- `STATIC_DIR=/app/spa`
- `BACKEND_URL` → Core private URL
- Build arg / secret `GH_TOKEN` (or `GITHUB_TOKEN`) if the frontend repo is private
