// BharatOne — health-scan
// Probes every module of the platform and records the result against that module
// (public.log_health), which keeps a per-module log, tracks current state, opens an
// incident the moment something breaks and notifies admins. Runs on a schedule
// (pg_cron every 5 minutes) and can also be invoked manually from the admin screen.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = Deno.env.get("SITE_URL") ?? "https://www.mybharatone.com";

type Res = { status: "ok" | "warn" | "down"; message: string; latency?: number; detail?: unknown };

async function probe(url: string, opts: RequestInit = {}, timeoutMs = 12000): Promise<Res> {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const ms = Date.now() - t0;
    if (!r.ok) return { status: r.status >= 500 ? "down" : "warn", message: `HTTP ${r.status} in ${ms}ms`, latency: ms };
    if (ms > 6000) return { status: "warn", message: `Slow response (${ms}ms)`, latency: ms };
    return { status: "ok", message: `OK in ${ms}ms`, latency: ms };
  } catch (e) {
    const ms = Date.now() - t0;
    const msg = String(e).includes("abort") ? `Timed out after ${timeoutMs}ms` : `Unreachable: ${String(e).slice(0, 120)}`;
    return { status: "down", message: msg, latency: ms };
  } finally { clearTimeout(timer); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: Record<string, Res> = {};
  const log = async (mod: string, r: Res, source = "scanner") => {
    results[mod] = r;
    await svc.rpc("log_health", {
      p_module: mod, p_status: r.status, p_message: r.message,
      p_level: null, p_detail: r.detail ? (r.detail as Record<string, unknown>) : null,
      p_latency: r.latency ?? null, p_source: source,
    });
  };

  // ---------- 1. Public website + key pages ----------
  const home = await probe(SITE + "/");
  await log("website", home);
  await log("login", await probe(SITE + "/login"));
  await log("status_board", await probe(SITE + "/status/"));

  // ---------- 2. Database ----------
  {
    const t0 = Date.now();
    const { error } = await svc.from("system_modules").select("key").limit(1);
    const ms = Date.now() - t0;
    await log("database", error
      ? { status: "down", message: `Query failed: ${error.message.slice(0, 120)}`, latency: ms }
      : { status: ms > 3000 ? "warn" : "ok", message: `Query OK in ${ms}ms`, latency: ms });
  }

  // ---------- 3. Integrations — recent failure rates from real traffic ----------
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  // AEPS: look at the last 24h of transactions
  {
    const { data, error } = await svc.from("aeps_transactions")
      .select("status").gte("created_at", since).limit(500);
    if (error) {
      await log("aeps", { status: "warn", message: `Could not read AEPS transactions: ${error.message.slice(0, 90)}` });
    } else {
      const rows = data ?? [];
      const total = rows.length;
      const failed = rows.filter((r: { status: string }) => r.status === "failed").length;
      const stuck = rows.filter((r: { status: string }) => r.status === "pending_reconciliation").length;
      const rate = total ? Math.round((failed / total) * 100) : 0;
      await log("aeps", total === 0
        ? { status: "ok", message: "No AEPS transactions in the last 24h", detail: { total } }
        : stuck > 0
          ? { status: "warn", message: `${stuck} transaction(s) pending reconciliation · ${rate}% failure rate (${failed}/${total})`, detail: { total, failed, stuck } }
          : rate >= 50
            ? { status: "down", message: `High AEPS failure rate: ${rate}% (${failed}/${total})`, detail: { total, failed } }
            : rate >= 25
              ? { status: "warn", message: `Elevated AEPS failures: ${rate}% (${failed}/${total})`, detail: { total, failed } }
              : { status: "ok", message: `${total} transactions, ${rate}% failed`, detail: { total, failed } });
    }
  }

  // BBPS
  {
    const { data, error } = await svc.from("bbps_transactions")
      .select("status").gte("created_at", since).limit(500);
    if (error) {
      await log("bbps", { status: "warn", message: `Could not read BBPS transactions: ${error.message.slice(0, 90)}` });
    } else {
      const rows = data ?? [];
      const total = rows.length;
      const failed = rows.filter((r: { status: string }) => r.status === "failed").length;
      const stuck = rows.filter((r: { status: string }) => r.status === "pending_reconciliation").length;
      const rate = total ? Math.round((failed / total) * 100) : 0;
      await log("bbps", total === 0
        ? { status: "ok", message: "No bill payments in the last 24h", detail: { total } }
        : stuck > 0
          ? { status: "warn", message: `${stuck} bill payment(s) pending reconciliation`, detail: { total, failed, stuck } }
          : rate >= 50
            ? { status: "down", message: `High BBPS failure rate: ${rate}% (${failed}/${total})`, detail: { total, failed } }
            : { status: "ok", message: `${total} bill payments, ${rate}% failed`, detail: { total, failed } });
    }
  }

  // Delivery channels (SMS / email). Recency-aware: if the most recent sends are
  // succeeding, the channel is healthy even if older attempts failed — otherwise a
  // fixed service would stay red for 24h.
  const deliveryCheck = async (channel: "sms" | "email", label: string) => {
    const { data, error } = await svc.from("notification_log")
      .select("status,created_at").eq("channel", channel)
      .gte("created_at", since).order("created_at", { ascending: false }).limit(200);
    if (error) {
      await log(channel, { status: "warn", message: `Could not read ${label} log: ${error.message.slice(0, 90)}` });
      return;
    }
    const rows = (data ?? []) as { status: string }[];
    const total = rows.length;
    if (total === 0) { await log(channel, { status: "ok", message: `No ${label} sent in the last 24h`, detail: { total } }); return; }

    const failed = rows.filter((r) => r.status === "failed").length;
    const rate = Math.round((failed / total) * 100);
    // Recovery rule: the latest 3 attempts (or all, if fewer) all succeeded.
    const recent = rows.slice(0, Math.min(3, total));
    const recovered = recent.every((r) => r.status === "sent");

    if (recovered) {
      await log(channel, failed > 0
        ? { status: "ok", message: `${label} healthy — latest ${recent.length} sent OK (${failed} older failure${failed === 1 ? "" : "s"} in 24h)`, detail: { total, failed, rate } }
        : { status: "ok", message: `${total} ${label} sent, 0% failed`, detail: { total, failed } });
      return;
    }
    await log(channel, rate >= 40
      ? { status: "down", message: `${label} failing: ${rate}% (${failed}/${total})`, detail: { total, failed } }
      : rate >= 15
        ? { status: "warn", message: `Elevated ${label} failures: ${rate}% (${failed}/${total})`, detail: { total, failed } }
        : { status: "ok", message: `${total} ${label} sent, ${rate}% failed`, detail: { total, failed } });
  };
  await deliveryCheck("sms", "SMS");
  await deliveryCheck("email", "email");

  // Razorpay: unreconciled payments sitting too long
  {
    const twoHrs = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const { data, error } = await svc.from("razorpay_payments")
      .select("status,created_at").eq("status", "paid").lt("created_at", twoHrs).limit(200);
    if (error) {
      await log("razorpay", { status: "warn", message: `Could not read payments: ${error.message.slice(0, 90)}` });
    } else {
      const pending = (data ?? []).length;
      await log("razorpay", pending >= 10
        ? { status: "warn", message: `${pending} online payments awaiting reconciliation for over 2h`, detail: { pending } }
        : { status: "ok", message: pending ? `${pending} payment(s) awaiting reconciliation` : "All online payments reconciled", detail: { pending } });
    }
  }

  // Wallet integrity: no negative balances
  {
    const { data, error } = await svc.from("wallets").select("user_id,balance").lt("balance", 0).limit(50);
    if (error) {
      await log("wallet", { status: "warn", message: `Could not read wallets: ${error.message.slice(0, 90)}` });
    } else {
      const bad = (data ?? []).length;
      await log("wallet", bad > 0
        ? { status: "down", message: `${bad} wallet(s) have a NEGATIVE balance — investigate immediately`, detail: { count: bad } }
        : { status: "ok", message: "No negative wallet balances" });
    }
  }

  // Registration pipeline: anything stuck at the accountant for too long
  {
    const threeDays = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await svc.from("retailer_registrations")
      .select("id").eq("status", "accountant_review").lt("created_at", threeDays).limit(100);
    if (error) {
      await log("registration", { status: "warn", message: `Could not read registrations: ${error.message.slice(0, 90)}` });
    } else {
      const stale = (data ?? []).length;
      await log("registration", stale >= 20
        ? { status: "warn", message: `${stale} registrations waiting over 3 days for payment verification`, detail: { stale } }
        : { status: "ok", message: stale ? `${stale} registration(s) older than 3 days` : "Registration pipeline healthy", detail: { stale } });
    }
  }

  // E-Store + Support are informational health checks
  {
    const { error } = await svc.from("estore_orders").select("id").limit(1);
    await log("estore", error
      ? { status: "warn", message: `E-Store table unreachable: ${error.message.slice(0, 90)}` }
      : { status: "ok", message: "E-Store reachable" });
  }
  {
    const { data, error } = await svc.from("support_tickets").select("id,status").eq("status", "open").limit(200);
    await log("support", error
      ? { status: "warn", message: `Support tickets unreachable: ${error.message.slice(0, 90)}` }
      : (data ?? []).length >= 50
        ? { status: "warn", message: `${(data ?? []).length} open tickets — backlog building`, detail: { open: (data ?? []).length } }
        : { status: "ok", message: `${(data ?? []).length} open ticket(s)` });
  }

  const down = Object.entries(results).filter(([, r]) => r.status === "down").map(([k]) => k);
  const warn = Object.entries(results).filter(([, r]) => r.status === "warn").map(([k]) => k);

  return json({
    ok: true,
    scanned: Object.keys(results).length,
    down, warn,
    overall: down.length ? "down" : warn.length ? "warn" : "ok",
    results,
  });
});
