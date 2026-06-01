# Yahoo Finance Proxy — Cloudflare Worker Setup

This is a standalone Cloudflare Worker. No wrangler or npm required.

## Deploy

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in.
2. Navigate to **Workers & Pages** in the sidebar.
3. Click **Create** > **Create Worker**.
4. Give it a name (e.g. `aida-proxy`).
5. In the code editor, **delete** the default code and **paste** the full contents of
   [`tools/worker-yahoo-proxy.js`](../tools/worker-yahoo-proxy.js).
6. Click **Deploy**.
7. Copy your Worker URL (e.g. `https://aida-proxy.rodrigoarboes.workers.dev`).

## Configure the app

Set the Worker URL in your app config so the front-end fetches live data from
the proxy instead of static JSON files.

## Test

```bash
# Root info
curl https://aida-proxy.rodrigoarboes.workers.dev/

# Fetch 5 years of daily PETR4 data
curl https://aida-proxy.rodrigoarboes.workers.dev/chart/PETR4.SA

# Custom range and interval
curl "https://aida-proxy.rodrigoarboes.workers.dev/chart/AAPL?range=1y&interval=1wk"
```

## Notes

- Responses are cached at Cloudflare's edge for 1 hour (`Cache-Control: public, max-age=3600`).
- A per-IP rate limit of 30 requests/minute is enforced in-memory. This resets on Worker cold starts.
- CORS is fully open (`Access-Control-Allow-Origin: *`) so any browser origin can call it.
