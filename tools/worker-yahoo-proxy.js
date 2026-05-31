/**
 * AIDA Allocation — Yahoo Finance Proxy
 *
 * Cloudflare Worker that proxies Yahoo Finance chart data and returns
 * a clean JSON array compatible with the local data files:
 *   [{"data":"2023-01-02","close":100.50}, ...]
 *
 * Route:  GET /chart/{SYMBOL}?range=5y&interval=1d
 *
 * Deploy: paste this file into the Cloudflare dashboard Worker editor.
 * See docs/setup-worker.md for full instructions.
 */

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-isolate — resets on cold start)
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 30;          // requests per window
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

/** @type {Map<string, {count: number, resetAt: number}>} */
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();

  // Periodic cleanup: remove expired entries every check (cheap for small maps)
  if (rateLimitMap.size > 1000) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }

  let entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function padTwo(n) {
  return n < 10 ? "0" + n : String(n);
}

function timestampToDate(ts) {
  const d = new Date(ts * 1000);
  return (
    d.getUTCFullYear() +
    "-" +
    padTwo(d.getUTCMonth() + 1) +
    "-" +
    padTwo(d.getUTCDate())
  );
}

// ---------------------------------------------------------------------------
// Yahoo Finance fetch
// ---------------------------------------------------------------------------
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

async function fetchYahoo(symbol, range, interval) {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    return { ok: false, status: resp.status, message: `Yahoo returned ${resp.status}` };
  }

  let json;
  try {
    json = await resp.json();
  } catch {
    return { ok: false, status: 502, message: "Invalid JSON from Yahoo" };
  }

  const result = json?.chart?.result?.[0];
  if (!result) {
    return { ok: false, status: 404, message: "Ticker not found or no data available" };
  }

  const timestamps = result.timestamp;
  const adjclose =
    result.indicators?.adjclose?.[0]?.adjclose ??
    result.indicators?.quote?.[0]?.close;

  if (!timestamps || !adjclose) {
    return { ok: false, status: 404, message: "Ticker not found or no data available" };
  }

  const data = [];
  for (let i = 0; i < timestamps.length; i++) {
    const value = adjclose[i];
    if (value == null) continue;
    data.push({
      data: timestampToDate(timestamps[i]),
      close: Math.round(value * 100) / 100,
    });
  }

  if (data.length === 0) {
    return { ok: false, status: 404, message: "Ticker not found or no data available" };
  }

  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed", status: 405 }, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Root route ---
    if (path === "/" || path === "") {
      return jsonResponse({
        service: "AIDA Allocation — Yahoo Finance Proxy",
        usage: "GET /chart/{SYMBOL}?range=5y&interval=1d",
        example: "/chart/PETR4.SA",
      });
    }

    // --- Chart route ---
    const chartMatch = path.match(/^\/chart\/([^/]+)$/);
    if (!chartMatch) {
      return jsonResponse({ error: "Not found", status: 404 }, 404);
    }

    // Rate limiting
    const clientIP =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "unknown";

    if (isRateLimited(clientIP)) {
      return jsonResponse(
        { error: "Rate limit exceeded. Try again in a minute." },
        429
      );
    }

    const symbol = decodeURIComponent(chartMatch[1]);
    const range = url.searchParams.get("range") || "5y";
    const interval = url.searchParams.get("interval") || "1d";

    const result = await fetchYahoo(symbol, range, interval);

    if (!result.ok) {
      return jsonResponse(
        { error: result.message, status: result.status },
        result.status
      );
    }

    return jsonResponse(result.data, 200, {
      "Cache-Control": "public, max-age=3600",
    });
  },
};
