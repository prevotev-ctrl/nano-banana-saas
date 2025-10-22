import Replicate from "replicate";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });

    const body = await req.json();
    const { projectId } = body || {};
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId requis" }), { status: 400 });
    }

    // Fetch project and validate ownership and payment
    const { data: project, error: selErr } = await supabase
      .from("projects")
      .select("id, user_id, prompt, input_image_url, status, payment_status")
      .eq("id", projectId)
      .single();
    if (selErr || !project) {
      return new Response(JSON.stringify({ error: selErr?.message || "Projet introuvable" }), { status: 404 });
    }
    if (project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403 });
    }
    if (project.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Paiement requis" }), { status: 402 });
    }
    if (project.status && project.status !== "pending") {
      return new Response(JSON.stringify({ error: "Projet déjà traité" }), { status: 400 });
    }

    const outputBucket = process.env.OUTPUT_BUCKET || "output-images";
    const inputImageUrls = [project.input_image_url].filter(Boolean);
    const prompt = project.prompt;

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const replicateInput = { prompt, image_input: inputImageUrls };
    const output = await replicate.run("google/nano-banana", { input: replicateInput });

    let outputUrl = null;
    if (output && typeof output === "object") {
      if (typeof output.url === "function") outputUrl = output.url();
      else if (typeof output.url === "string") outputUrl = output.url;
      else if (Array.isArray(output) && output.length) {
        const first = output[0];
        if (typeof first === "string") outputUrl = first;
        else if (first && typeof first.url === "function") outputUrl = first.url();
        else if (first && typeof first.url === "string") outputUrl = first.url;
      }
    } else if (typeof output === "string") {
      outputUrl = output;
    }
    if (!outputUrl) {
      return new Response(JSON.stringify({ error: "Impossible de déterminer l'URL de sortie du modèle", raw: output }), { status: 502 });
    }

    const res = await fetch(outputUrl);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Téléchargement de l'image de sortie échoué", status: res.status }), { status: 502 });
    }
    const arrayBuffer = await res.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Mark project as processing
    await supabase
      .from("projects")
      .update({ status: "processing" })
      .eq("id", projectId);
    const outPath = `outputs/${projectId}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(outputBucket)
      .upload(outPath, fileBuffer, {
        contentType: res.headers.get("content-type") || "image/jpeg",
        upsert: true
      });
    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(outputBucket)
      .getPublicUrl(outPath);
    const publicOutputUrl = publicData?.publicUrl || null;

    const { error: updateError } = await supabase
      .from("projects")
      .update({ output_image_url: publicOutputUrl, status: "succeeded" })
      .eq("id", projectId);
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        id: projectId,
        prompt,
        input_image_urls: inputImageUrls,
        output_image_url: publicOutputUrl
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
}
