import { stripe } from "../../../../lib/stripe";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "STRIPE_WEBHOOK_SECRET manquant" }), { status: 500 });
  }

  let rawBody;
  try {
    rawBody = await req.text(); // raw payload required by Stripe signature verification
  } catch (e) {
    return new Response(JSON.stringify({ error: "Lecture du corps du webhook échouée" }), { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Signature Stripe manquante" }), { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Signature invalide: ${err.message}` }), { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const projectId = session?.metadata?.project_id;
        if (projectId) {
          await supabaseAdmin
            .from("projects")
            .update({
              payment_status: "paid",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
            })
            .eq("id", projectId);
        }
        break;
      }
      default:
        // Ignore other event types for now
        break;
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
}

