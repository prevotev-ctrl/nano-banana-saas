import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { stripe } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const projectId = body?.projectId;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId requis" }), { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });

    // Load project and verify ownership and status
    const { data: project, error: selErr } = await supabase
      .from("projects")
      .select("id, user_id, payment_status")
      .eq("id", projectId)
      .single();
    if (selErr || !project)
      return new Response(JSON.stringify({ error: selErr?.message || "Projet introuvable" }), { status: 404 });
    if (project.user_id !== user.id)
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403 });
    if (project.payment_status === "paid")
      return new Response(JSON.stringify({ error: "Projet déjà payé" }), { status: 400 });

    // Create Checkout Session with hardcoded price 2.00 EUR (server-authoritative)
    const successUrl = `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/dashboard`;
    const cancelUrl = successUrl;

    const sessionStripe = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Génération d'image IA" },
            unit_amount: 200, // 2.00 EUR
          },
          quantity: 1,
        },
      ],
      metadata: { project_id: projectId, user_id: user.id },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Persist session id for traceability
    await supabase
      .from("projects")
      .update({ stripe_checkout_session_id: sessionStripe.id, payment_amount: 2.0, payment_status: "pending" })
      .eq("id", projectId);

    return new Response(
      JSON.stringify({ id: sessionStripe.id, url: sessionStripe.url }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
}

