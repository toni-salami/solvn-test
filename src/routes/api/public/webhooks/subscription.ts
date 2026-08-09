import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type SubscriptionStatus =
  | "no_subscription"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number | string;
    status?: string;
    subscription_code?: string;
    customer?: { email?: string; customer_code?: string };
    email?: string;
    subscription?: {
      subscription_code?: string;
      status?: string;
      customer?: { email?: string };
    };
  };
};

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function mapStatus(event: string, payloadStatus?: string): SubscriptionStatus | null {
  switch (event) {
    case "subscription.create":
    case "subscription.enable": {
      const s = (payloadStatus ?? "").toLowerCase();
      if (s === "trialing" || s === "trial") return "trialing";
      return "active";
    }
    case "invoice.payment_failed":
      return "past_due";
    case "subscription.disable":
    case "subscription.not_renew":
      return "canceled";
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/public/webhooks/subscription")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) {
          console.error("[subscription-webhook] PAYSTACK_SECRET_KEY is not configured");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-paystack-signature");
        if (!verifySignature(rawBody, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let parsed: PaystackEvent;
        try {
          parsed = JSON.parse(rawBody) as PaystackEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType = parsed.event ?? "";
        const data = parsed.data ?? {};
        const subscriptionCode =
          data.subscription_code ?? data.subscription?.subscription_code ?? null;
        const email =
          data.customer?.email ?? data.email ?? data.subscription?.customer?.email ?? null;
        const payloadStatus = data.status ?? data.subscription?.status;

        // Stable dedupe key for retried deliveries.
        const eventId =
          data.id != null
            ? `${eventType}:${String(data.id)}`
            : `${eventType}:${createHmac("sha512", secret).update(rawBody, "utf8").digest("hex").slice(0, 64)}`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: unique (provider, event_id) — a duplicate insert means already seen.
        const { error: insertError } = await supabaseAdmin.from("subscription_events").insert({
          provider: "paystack",
          event_id: eventId,
          event_type: eventType,
          subscription_code: subscriptionCode,
          customer_email: email,
          payload: parsed as unknown as Record<string, unknown>,
        });

        if (insertError) {
          if (insertError.code === "23505") {
            return Response.json({ ok: true, deduped: true });
          }
          console.error("[subscription-webhook] failed to record event", insertError.message);
          return new Response("Failed to record event", { status: 500 });
        }

        const nextStatus = mapStatus(eventType, payloadStatus);
        if (!nextStatus) {
          await supabaseAdmin
            .from("subscription_events")
            .update({ processed_at: new Date().toISOString() })
            .eq("provider", "paystack")
            .eq("event_id", eventId);
          return Response.json({ ok: true, ignored: eventType });
        }

        // Seller lookup: no 1:1 subscription mapping exists yet, so resolve via
        // the seller's contact email. Unmatched events are recorded, not applied.
        let sellerId: string | null = null;
        if (email) {
          const { data: contact } = await supabaseAdmin
            .from("seller_contacts")
            .select("seller_id")
            .ilike("email", email)
            .maybeSingle();
          sellerId = contact?.seller_id ?? null;
        }

        if (sellerId) {
          const { error: updateError } = await supabaseAdmin
            .from("sellers")
            .update({ subscription_status: nextStatus })
            .eq("id", sellerId);
          if (updateError) {
            console.error("[subscription-webhook] failed to update seller", updateError.message);
            return new Response("Failed to update seller", { status: 500 });
          }
        } else {
          console.warn("[subscription-webhook] no matching seller for event", eventId);
        }

        await supabaseAdmin
          .from("subscription_events")
          .update({ seller_id: sellerId, processed_at: new Date().toISOString() })
          .eq("provider", "paystack")
          .eq("event_id", eventId);

        return Response.json({ ok: true, matched: Boolean(sellerId), status: nextStatus });
      },
    },
  },
});
