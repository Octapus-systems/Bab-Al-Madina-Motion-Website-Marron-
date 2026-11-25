# Bab Al Madina Orders API (v1.0)

This is a read-only REST API. It gives the Bab Al Madina Admin Panel the orders that customers place on the website.

The API reads the website's own Supabase database (the `orders`, `order_items`, `customers` and `products` tables). There is no copy of the data, so every response is live.

| | |
|---|---|
| **Base URL** | `https://svpibekwuiexrrgygxwz.supabase.co/functions/v1/admin-orders-api` |
| **Format** | JSON (UTF-8). Arabic product names are returned as-is. |
| **Methods** | `GET` only. The API cannot create, change or delete orders. |
| **Auth** | `x-api-key` header |
| **Source** | [`supabase/functions/admin-orders-api/index.ts`](../supabase/functions/admin-orders-api/index.ts) |

---

## 1. Authentication

Send the API key in the `x-api-key` header on every request:

```http
GET /functions/v1/admin-orders-api/orders HTTP/1.1
Host: svpibekwuiexrrgygxwz.supabase.co
x-api-key: <YOUR_ADMIN_API_KEY>
```

If the key is missing or wrong, the API returns `401`:

```json
{ "error": { "code": "unauthorized", "message": "Missing or invalid x-api-key header." } }
```

**Keeping the key safe**

- Call the API from the Admin Panel's **server or backend**. Keep the key in a server environment variable, for example `BAB_ORDERS_API_KEY`.
- Don't put the key in browser JavaScript, mobile app bundles or a Git repository. Anyone who has the key can read every customer's name, phone number and address.
- The server stores only a SHA-256 hash of the key. Nobody can recover the key from the server, so keep your own copy. To rotate or revoke it, see [section 6](#6-key-management).

---

## 2. Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Checks the connection and the key |
| GET | `/orders` | Lists orders, newest first, with filters and paging |
| GET | `/orders/{id}` | Returns one order, looked up by UUID **or** order number |

### 2.1 `GET /health`

```bash
curl -H "x-api-key: $BAB_ORDERS_API_KEY" \
  https://svpibekwuiexrrgygxwz.supabase.co/functions/v1/admin-orders-api/health
```

```json
{ "status": "ok", "service": "bab-al-madina-orders-api", "version": "1.0.0" }
```

### 2.2 `GET /orders`

**Query parameters (all optional)**

| Param | Type | Description |
|---|---|---|
| `limit` | int | Page size, 1–100. Default `50`. |
| `offset` | int | Number of orders to skip. Default `0`. |
| `sort` | `desc` \| `asc` | Sorts by `created_at`. Default `desc` (newest first). |
| `status` | string | One status, or several separated by commas: `new`, `confirmed`, `packed`, `out_for_delivery`, `delivered`, `cancelled`. |
| `from` | ISO date or datetime | Orders created at or after this time, e.g. `2026-11-01` or `2026-11-01T08:00:00+04:00`. |
| `to` | ISO date or datetime | Orders created at or before this time. A date on its own (`2026-11-30`) includes that whole day. |
| `updated_since` | ISO datetime | Only orders changed after this time. Use this for incremental sync (see §5). |
| `delivery_date` | `YYYY-MM-DD` | Orders scheduled for delivery on this date. |
| `phone` | string | Exact customer phone number, as entered, e.g. `+971501234567`. |
| `customer_id` | UUID | All orders from one customer. |
| `search` | string | Partial match on first name, last name, phone or email. A number also matches the order number. |

> Plain dates such as `2026-11-25` are read as **UTC midnight**, which is 04:00 in Dubai. If you need exact Dubai day boundaries, send the full time with the offset, e.g. `from=2026-11-25T00:00:00+04:00`.

**Example request**

```bash
curl -H "x-api-key: $BAB_ORDERS_API_KEY" \
  "https://svpibekwuiexrrgygxwz.supabase.co/functions/v1/admin-orders-api/orders?status=new,confirmed&limit=20"
```

**Example response `200`**

```json
{
  "data": [
    {
      "id": "0348ade8-1992-488f-85c6-c492a8e8ec82",
      "order_number": 1003,
      "status": "new",
      "created_at": "2026-11-25T19:19:00.457434+00:00",
      "updated_at": "2026-11-25T19:19:00.457434+00:00",
      "customer": {
        "id": "012920f3-5c97-443c-a1e5-0c190d8677f3",
        "first_name": "Ahmed",
        "last_name": "Khan",
        "full_name": "Ahmed Khan",
        "phone": "+971501234567",
        "email": null
      },
      "delivery": {
        "address": "Villa 12, Street 5, Al Barsha",
        "emirate": "Dubai",
        "notes": "Call before arriving",
        "date": "2026-11-26"
      },
      "payment": { "method": "cash_on_delivery" },
      "amounts": { "currency": "AED", "subtotal": 45, "delivery_fee": 0, "total": 45 },
      "items": [
        {
          "id": "fa414057-5e6c-457c-ac02-374a9ee2ccad",
          "product_id": "84671db9-1efa-450f-86f4-bb9d3ae0c0ef",
          "sku": "BAB-TRAY-30",
          "product_name": "Fresh Eggs — Tray of 30",
          "product_name_ar": "بيض طازج - ٣٠ بيضة",
          "image_url": null,
          "unit_price": 15,
          "quantity": 3,
          "line_total": 45
        }
      ],
      "item_count": 3,
      "admin_note": null
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 1, "has_more": false }
}
```

### 2.3 `GET /orders/{id}`

`{id}` is either the order's UUID (`id`) or its customer-facing number (`order_number`).

```bash
curl -H "x-api-key: $BAB_ORDERS_API_KEY" \
  https://svpibekwuiexrrgygxwz.supabase.co/functions/v1/admin-orders-api/orders/1003
```

**Response `200`:** `{ "data": { ...one order, same shape as in the list... } }`

**Response `404`:**

```json
{ "error": { "code": "not_found", "message": "Order '999999' was not found." } }
```

---

## 3. Field reference

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Permanent order ID. Use it as your foreign key. |
| `order_number` | int | Number shown to the customer. Starts at 1001. |
| `status` | enum | `new` → `confirmed` → `packed` → `out_for_delivery` → `delivered`, or `cancelled` |
| `created_at` / `updated_at` | ISO datetime (UTC) | `updated_at` changes whenever the order row changes. |
| `customer.id` | UUID \| null | A customer is identified by phone number. Repeat buyers keep the same `customer.id`. |
| `customer.*` | | Name, phone and email **as entered on this order**. |
| `delivery.date` | `YYYY-MM-DD` | Scheduled delivery date: the day after the order, Dubai time. |
| `delivery.emirate` / `notes` / `customer.email` | string \| null | Optional fields. They may be `null`. |
| `payment.method` | enum | `cash_on_delivery` or `card_on_delivery` |
| `amounts.*` | number (AED) | `total = subtotal + delivery_fee` |
| `items[].product_name` / `unit_price` | | Name and price **at the time of the order**. They stay the same if the product is later renamed or repriced. |
| `items[].product_id` / `sku` / `product_name_ar` / `image_url` | | Current product details. These are `null` if the product has since been deleted. |
| `admin_note` | string \| null | Internal note |

---

## 4. Errors

Every error has the same shape: `{ "error": { "code": "...", "message": "..." } }`

| HTTP | `code` | When |
|---|---|---|
| 400 | `invalid_parameter` | Bad `status`, a date that can't be read, a malformed `customer_id` or order ID |
| 401 | `unauthorized` | Missing or wrong `x-api-key` |
| 404 | `not_found` | Unknown order, or unknown route |
| 405 | `method_not_allowed` | Any method other than `GET` |
| 500 | `database_error` / `internal_error` | Server-side problem. Retry with backoff. |

---

## 5. Integration guide

**Polling for new and changed orders.** This is the recommended way to keep the Admin Panel up to date:

1. On first sync, page through `GET /orders?sort=asc&limit=100&offset=…` until `has_more` is `false`.
2. Save the highest `updated_at` you received.
3. Every 30–60 seconds, call `GET /orders?updated_since=<saved updated_at>&sort=asc&limit=100`. Upsert each order by `id`, then save the new highest `updated_at`.

**Node.js (server-side) example**

```js
const BASE = "https://svpibekwuiexrrgygxwz.supabase.co/functions/v1/admin-orders-api";

async function babOrders(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { "x-api-key": process.env.BAB_ORDERS_API_KEY } });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${body.error?.code}: ${body.error?.message}`);
  return body;
}

const { data: newOrders } = await babOrders("/orders", { status: "new", limit: 50 });
const { data: order } = await babOrders("/orders/1003");
```

**PHP example**

```php
$ch = curl_init("https://svpibekwuiexrrgygxwz.supabase.co/functions/v1/admin-orders-api/orders?status=new");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["x-api-key: " . getenv("BAB_ORDERS_API_KEY")],
]);
$orders = json_decode(curl_exec($ch), true)["data"];
```

---

## 6. Key management

These steps are done in the Supabase dashboard: project `svpibekwuiexrrgygxwz` → **Edge Functions → Secrets**.

1. Generate a new key, for example with `openssl rand -hex 24`, and prefix it with `bam_live_`.
2. Compute its SHA-256 hash: `printf '%s' "<new key>" | sha256sum`.
3. Set the secret `ADMIN_API_KEY_HASHES` to the hash. To rotate without downtime, set it to the old hash and the new hash separated by a comma, switch the Admin Panel to the new key, then remove the old hash.
4. Once `ADMIN_API_KEY_HASHES` is set, it **replaces** the built-in default key.

Optional: set the secret `ADMIN_API_ALLOWED_ORIGINS`, e.g. `https://admin.example.com`, to limit which websites can call the API from a browser. Calls from a server are not affected.
