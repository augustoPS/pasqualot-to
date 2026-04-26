# pasqualo.to

Personal site and photo gallery. Built with Astro 6 + Tailwind v4, deployed on Vercel.

## Run locally

```sh
npm install
npm run dev       # localhost:4321
npm run test      # vitest
```

## Deploy

```sh
npm run deploy    # astro build + vercel deploy --prebuilt --prod
```

Or push to `main` — Vercel deploys automatically.

## Env vars

| Variable | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (shared with shop) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `PHOTO_JWT_SECRET` | JWT signing secret for protected album tokens |
| `ALBUM_PASSWORD_*` | Per-album passwords (e.g. `ALBUM_PASSWORD_MYALBUM`) |
| `PUBLIC_ABOUT_PHOTO_ORIENTATION` | `portrait` or `landscape` — controls about page photo layout |
