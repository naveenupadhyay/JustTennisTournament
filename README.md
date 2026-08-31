# JUST Tennis League

Editable tournament website for group-stage standings, score sheets, and knockout brackets.

## Admin

The private admin route is:

`/admin-clay-desk-7429`

## Vercel Storage

For persistent admin saves on Vercel, connect an Upstash Redis database through the Vercel Marketplace. The app reads either of these environment variable pairs:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`

Without Redis environment variables, saves only persist in the currently running local server process.
