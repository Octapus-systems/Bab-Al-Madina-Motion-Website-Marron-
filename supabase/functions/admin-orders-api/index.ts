// Bab Al Madina — read-only Orders API for the external Admin Panel.
//
// Deployed as a Supabase Edge Function in the same project the website writes orders to,
// so it reads the existing `orders` / `order_items` / `customers` tables directly — no
// duplicate database, and the website's ordering flow is untouched.
//
// Auth: every request must send `x-api-key: <key>`. Only the SHA-256 hash of valid keys is
// stored (ADMIN_API_KEY_HASHES secret, comma-separated, or the built-in default below), so the
// plain key never lives in code. The service-role key is used only inside this function.
//
// Routes (relative to https://<project>.supabase.co/functions/v1/admin-orders-api):
//   GET /health
//   GET /orders            list, filterable + paginated
//   GET /orders/:id        single order by UUID or order number

import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_KEY_HASHES = ["82592ac8430a54a971d43ac61af0cad31f2abf9dac0265c3a1283064866516f8"];
const KEY_HASHES = (Deno.env.get("ADMIN_API_KEY_HASHES") ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const VALID_HASHES = KEY_HASHES.length ? KEY_HASHES : DEFAULT_KEY_HASHES;

// Optional comma-separated list of browser origins allowed to call the API. Server-to-server
// calls don't need CORS at all; "*" is the default so any server/tool can integrate.
const ALLOWED_ORIGINS = (Deno.env.get("ADMIN_API_ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const STATUSES = ["new", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled"];
const MAX_LIMIT = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ORDER_SELECT =
  "id, order_number, status, customer_id, first_name, last_name, phone, email, emirate, address, " +
  "delivery_notes, delivery_date, payment_method, subtotal, delivery_fee, total, admin_note, created_at, updated_at, " +
  "order_items(id, product_id, product_name, unit_price, quantity, line_total, products(sku, name_ar, image_url))";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "x-api-key, content-type, authorization, apikey",
    "Access-Control-Max-Age": "86400",
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(req) },
  });
}

function error(req: Request, status: number, code: string, message: string) {
  return json(req, status, { error: { code, message } });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAuthorized(req: Request) {
  const key = req.headers.get("x-api-key")?.trim();
  if (!key) return false;
  const hash = await sha256Hex(key);
  return VALID_HASHES.some((h) => timingSafeEqual(h, hash));
}

// deno-lint-ignore no-explicit-any
function formatOrder(o: any) {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    created_at: o.created_at,
    updated_at: o.updated_at,
    customer: {
      id: o.customer_id,
      first_name: o.first_name,
      last_name: o.last_name,
      full_name: `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim(),
      phone: o.phone,
      email: o.email,
    },
    delivery: {
      address: o.address,
      emirate: o.emirate,
      notes: o.delivery_notes,
      date: o.delivery_date,
    },
    payment: { method: o.payment_method },
    amounts: {
      currency: "AED",
      subtotal: num(o.subtotal),
      delivery_fee: num(o.delivery_fee) ?? 0,
      total: num(o.total),
    },
    // deno-lint-ignore no-explicit-any
    items: (o.order_items ?? []).map((it: any) => ({
      id: it.id,
      product_id: it.product_id,
      sku: it.products?.sku ?? null,
      product_name: it.product_name,
      product_name_ar: it.products?.name_ar ?? null,
      image_url: it.products?.image_url ?? null,
      unit_price: num(it.unit_price),
      quantity: it.quantity,
      line_total: num(it.line_total),
    })),
    item_count: (o.order_items ?? []).reduce((s: number, it: { quantity: number }) => s + it.quantity, 0),
    admin_note: o.admin_note,
  };
}

function parseDate(value: string | null, name: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new RangeError(`'${name}' must be an ISO date, e.g. 2026-11-26 or 2026-11-26T10:00:00Z`);
  return d.toISOString();
}

async function listOrders(req: Request, params: URLSearchParams) {
  const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "50", 10) || 50, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(params.get("offset") ?? "0", 10) || 0, 0);
  const sort = params.get("sort") === "asc" ? "asc" : "desc";

  let from: string | null, to: string | null, updatedSince: string | null;
  try {
    from = parseDate(params.get("from"), "from");
    to = parseDate(params.get("to"), "to");
    updatedSince = parseDate(params.get("updated_since"), "updated_since");
  } catch (e) {
    return error(req, 400, "invalid_parameter", (e as Error).message);
  }
  // A bare date for `to` means "through the end of that day".
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(params.get("to")!)) {
    to = new Date(new Date(to).getTime() + 86_400_000 - 1).toISOString();
  }

  const statuses = (params.get("status") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const badStatus = statuses.find((s) => !STATUSES.includes(s));
  if (badStatus) return error(req, 400, "invalid_parameter", `Unknown status '${badStatus}'. Allowed: ${STATUSES.join(", ")}`);

  let query = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: sort === "asc" })
    .range(offset, offset + limit - 1);

  if (statuses.length) query = query.in("status", statuses);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (updatedSince) query = query.gt("updated_at", updatedSince);
  if (params.get("delivery_date")) query = query.eq("delivery_date", params.get("delivery_date"));
  if (params.get("phone")) query = query.eq("phone", params.get("phone"));
  if (params.get("customer_id")) {
    if (!UUID_RE.test(params.get("customer_id")!)) return error(req, 400, "invalid_parameter", "'customer_id' must be a UUID");
    query = query.eq("customer_id", params.get("customer_id"));
  }

  const search = (params.get("search") ?? "").replace(/[^\p{L}\p{N}\s+@.-]/gu, "").trim();
  if (search) {
    const like = `%${search}%`;
    const ors = [`first_name.ilike.${like}`, `last_name.ilike.${like}`, `phone.ilike.${like}`, `email.ilike.${like}`];
    if (/^\d+$/.test(search)) ors.push(`order_number.eq.${search}`);
    query = query.or(ors.join(","));
  }

  const { data, error: dbError, count } = await query;
  if (dbError) {
    console.error("listOrders", dbError);
    return error(req, 500, "database_error", "Could not load orders.");
  }

  const total = count ?? 0;
  return json(req, 200, {
    data: (data ?? []).map(formatOrder),
    pagination: { limit, offset, total, has_more: offset + (data?.length ?? 0) < total },
  });
}

async function getOrder(req: Request, idOrNumber: string) {
  let query = supabase.from("orders").select(ORDER_SELECT);
  if (UUID_RE.test(idOrNumber)) query = query.eq("id", idOrNumber);
  else if (/^\d+$/.test(idOrNumber)) query = query.eq("order_number", Number(idOrNumber));
  else return error(req, 400, "invalid_parameter", "Order id must be a UUID or an order number.");

  const { data, error: dbError } = await query.maybeSingle();
  if (dbError) {
    console.error("getOrder", dbError);
    return error(req, 500, "database_error", "Could not load the order.");
  }
  if (!data) return error(req, 404, "not_found", `Order '${idOrNumber}' was not found.`);
  return json(req, 200, { data: formatOrder(data) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  // Path arrives as /admin-orders-api/<route>; strip the function name.
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const fnIndex = parts.indexOf("admin-orders-api");
  const route = fnIndex >= 0 ? parts.slice(fnIndex + 1) : parts;

  if (!(await isAuthorized(req))) {
    return error(req, 401, "unauthorized", "Missing or invalid x-api-key header.");
  }
  if (req.method !== "GET") return error(req, 405, "method_not_allowed", "This API is read-only. Use GET.");

  try {
    if (route.length === 0 || (route.length === 1 && route[0] === "health")) {
      return json(req, 200, { status: "ok", service: "bab-al-madina-orders-api", version: "1.0.0" });
    }
    if (route[0] === "orders" && route.length === 1) return await listOrders(req, url.searchParams);
    if (route[0] === "orders" && route.length === 2) return await getOrder(req, decodeURIComponent(route[1]));
    return error(req, 404, "not_found", `No route for GET /${route.join("/")}`);
  } catch (e) {
    console.error("unhandled", e);
    return error(req, 500, "internal_error", "Unexpected server error.");
  }
});
