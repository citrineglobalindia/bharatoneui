// BharatOne — starting an ICICI payment from the browser.
//
// ICICI is a redirect gateway, not an in-page modal like Razorpay: we ask our own
// server to register the sale, then send the customer to ICICI. They come back to
// /payment-result, which reports what the server concluded.
//
// Nothing sensitive happens here — the merchant key never leaves the edge function,
// and this file only ever sees the URL to redirect to.
import { supabase } from "@/integrations/supabase/client";
import { logAccess } from "@/lib/audit";

export type PayPurpose = "wallet_topup" | "registration_fee" | "service_payment" | "estore_order";

export type IciciStart = {
  amount: number;
  purpose: PayPurpose;
  /** Our own reference for whatever is being paid for (registration id, order no…). */
  refId?: string | null;
  name?: string;
  email?: string;
  contact?: string;
  /** Restrict the payment page. UPI avoids the convenience fee and the QR step. */
  paymentMode?: "UPI" | "CARD" | "NB" | "WALLET";
  /** Payer's UPI id — with paymentMode UPI, ICICI sends a collect request to their app. */
  upiVpa?: string;
};

export type IciciResult =
  | { status: "redirecting"; ref: string }
  | { status: "not_configured"; message: string }
  | { status: "failed"; message: string };

/** Which gateway is currently handling this kind of payment. */
export async function gatewayFor(purpose: PayPurpose): Promise<"icici" | "razorpay" | null> {
  const { data } = await (supabase as any)
    .from("payment_routing")
    .select("gateway,enabled")
    .eq("purpose", purpose)
    .maybeSingle();
  if (!data?.enabled) return null;
  return data.gateway as "icici" | "razorpay";
}

/** A UPI id looks like name@bank. Deliberately loose — banks keep inventing handles. */
export const isValidVpa = (v: string) => /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(v.trim());

/**
 * Register the sale and hand the browser over to ICICI.
 *
 * On success this navigates away, so nothing after it runs. Errors are returned
 * rather than thrown so the caller can show them in place.
 */
export async function startIciciPayment(opts: IciciStart): Promise<IciciResult> {
  const { data, error } = await (supabase as any).functions.invoke("icici-initiate", {
    body: {
      purpose: opts.purpose,
      amount: opts.amount,
      ref_id: opts.refId ?? null,
      name: opts.name ?? "",
      email: opts.email ?? "",
      contact: opts.contact ?? "",
      payment_mode: opts.paymentMode ?? "",
      upi_vpa: opts.upiVpa ?? "",
    },
  });

  if (error) {
    return { status: "failed", message: error.message ?? "Could not reach the payment gateway" };
  }
  if (data?.status === "not_configured") {
    return {
      status: "not_configured",
      message: data.message ?? "Online payment is not enabled yet",
    };
  }
  if (data?.status !== "initiated" || !data?.redirect_url) {
    return { status: "failed", message: data?.message ?? "The payment could not be started" };
  }

  logAccess({
    kind: "action",
    module: "wallet",
    action: `Started ICICI payment ${data.merchant_txn_no}`,
    entity: data.merchant_txn_no,
    detail: { amount: opts.amount, purpose: opts.purpose, mode: opts.paymentMode ?? "any" },
  });

  // Leaves the site. The customer returns to /payment-result.
  window.location.href = data.redirect_url as string;
  return { status: "redirecting", ref: String(data.merchant_txn_no) };
}
