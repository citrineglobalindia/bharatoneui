import { supabase } from "@/integrations/supabase/client";

// Reusable Razorpay Checkout flow. Creates an order server-side, opens Checkout,
// then verifies the signature server-side before the payment is settled. The
// secret key never touches the browser — only the publishable key_id is used here.
let loaded = false;
function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (loaded || (window as any).Razorpay) { loaded = true; return resolve(true); }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => { loaded = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export type Purpose = "wallet_topup" | "registration_fee" | "service_payment";
export type PayResult = { status: "received" | "paid" | "failed" | "not_configured" | "dismissed"; message?: string; balance?: number | null; amount?: number };

export async function payWithRazorpay(opts: {
  amount: number; purpose: Purpose; refId?: string;
  name?: string; email?: string; contact?: string; description?: string;
}): Promise<PayResult> {
  const { data: order, error } = await supabase.functions.invoke("razorpay-order", {
    body: { amount: opts.amount, purpose: opts.purpose, refId: opts.refId },
  });
  if (error) return { status: "failed", message: error.message };
  const o = order as any;
  if (o?.status === "not_configured") return { status: "not_configured", message: o.message };
  if (o?.status !== "created") return { status: "failed", message: o?.message || "Could not start payment" };

  const ok = await loadCheckout();
  if (!ok) return { status: "failed", message: "Could not load Razorpay Checkout" };

  return new Promise<PayResult>((resolve) => {
    const rzp = new (window as any).Razorpay({
      key: o.key_id,
      amount: o.amount * 100,
      currency: o.currency || "INR",
      order_id: o.order_id,
      name: "BharatOne",
      description: opts.description || "Payment",
      prefill: { name: opts.name, email: opts.email, contact: opts.contact },
      theme: { color: "#1F7A3D" },
      handler: async (resp: any) => {
        const { data: v, error: vErr } = await supabase.functions.invoke("razorpay-verify", {
          body: {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          },
        });
        if (vErr) { resolve({ status: "failed", message: vErr.message }); return; }
        const vr = v as any;
        const st = vr?.status;
        resolve({ status: st === "received" || st === "paid" ? "received" : "failed", message: vr?.message, balance: vr?.balance, amount: vr?.amount });
      },
      modal: { ondismiss: () => resolve({ status: "dismissed" }) },
    });
    rzp.open();
  });
}
