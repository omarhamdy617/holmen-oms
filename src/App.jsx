// Supabase Edge Function — holmen-woo-sync
// الصق ده في Supabase → Edge Functions → New Function → اسمها: woo-sync

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!
const WC_URL = "https://holmenpump.com/wp-json/wc/v3"
const WC_CK = "ck_5e74b2071b51bb1f374a515ed7a825bc34b087d4"
const WC_CS = "cs_0d8eb60d85c4236eb4314b2921c5a0653fffed50"
const WC_AUTH = btoa(`${WC_CK}:${WC_CS}`)

function today() {
  return new Date().toLocaleDateString("ar-EG")
}

function genId(wcId: number) {
  return `WOO-${wcId}`
}

async function sb(path: string, method = "GET", body?: object) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await r.text()
  return txt ? JSON.parse(txt) : []
}

async function syncOrders() {
  // جيب آخر 20 أوردر من WooCommerce
  const wooRes = await fetch(`${WC_URL}/orders?per_page=50&orderby=date&order=desc`, {
    headers: { "Authorization": `Basic ${WC_AUTH}` }
  })
  
  if (!wooRes.ok) {
    return { error: `WooCommerce error: ${wooRes.status}` }
  }
  
  const wooOrders = await wooRes.json()
  
  // جيب يوزر الموقع من Supabase
  let websiteUser = await sb("users?username=eq.website&select=id")
  if (!websiteUser.length) {
    // عمل يوزر للموقع لو مش موجود
    const newUser = await sb("users", "POST", {
      name: "الموقع — أوتوماتيك",
      username: "website",
      password: "website_auto",
      roles: ["sales"]
    })
    websiteUser = newUser
  }
  const websiteUserId = websiteUser[0]?.id

  // جيب الأوردرات الموجودة في Supabase
  const existingOrders = await sb("orders?id=like.WOO-*&select=id")
  const existingIds = new Set(existingOrders.map((o: any) => o.id))

  let added = 0
  let skipped = 0

  for (const wo of wooOrders) {
    const orderId = genId(wo.id)
    
    // لو موجود بالفعل، skip (مش هنعدل الأوردرات الموجودة)
    if (existingIds.has(orderId)) {
      skipped++
      continue
    }

    const billing = wo.billing || {}
    const items = (wo.line_items || []).map((item: any) => ({
      name: item.name,
      qty: item.quantity,
      price: parseFloat(item.price || 0),
    }))

    const total = parseFloat(wo.total || 0)

    // Map WooCommerce status to our system
    // كل الأوردرات الجديدة تيجي في الانتظار عشان الفريق يراجعها
    const statusMap: Record<string, string> = {
      "processing": "pending",
      "completed": "delivered",
      "on-hold": "pending",
      "pending": "pending",
      "cancelled": "rejected",
      "refunded": "rejected",
    }

    const order = {
      id: orderId,
      customer_name: `${billing.first_name} ${billing.last_name}`.trim() || "عميل",
      phone: billing.phone || "",
      governorate: billing.state || billing.city || billing.address_2 || "",
      address: billing.address_1 || "",
      notes: `أوردر WooCommerce #${wo.id} — ${wo.payment_method_title || ""}`,
      items: items,
      status: statusMap[wo.status] || "pending",
      sales_id: websiteUserId,
      commission: 0,
      comm_paid: false,
      comm_settings: { type: "percent", value: 0 }, // no commission for website orders
      internal_notes: [],
      audit_log: [{
        by: "الموقع — أوتوماتيك",
        at: today(),
        action: "أوردر من الموقع",
        details: `WooCommerce #${wo.id} — ${wo.status}`
      }],
      created_at: today(),
      last_action_at: Date.now(),
      _created_ts: Date.now(),
    }

    // لو اتسلم زوده العمولة صفر
    if (order.status === "delivered") {
      order.delivered_at = today()
    }

    await sb("orders", "POST", order)
    added++
  }

  return { success: true, added, skipped, total: wooOrders.length }
}

serve(async (req) => {
  // Allow CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      }
    })
  }

  try {
    const result = await syncOrders()
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
