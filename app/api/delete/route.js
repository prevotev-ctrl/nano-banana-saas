import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

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
    const { id } = body || {};
    if (!id) return new Response(JSON.stringify({ error: "id requis" }), { status: 400 });

    const { data: project, error: selErr } = await supabase
      .from("projects")
      .select("id, output_image_url")
      .eq("id", id)
      .single();
    if (selErr || !project) return new Response(JSON.stringify({ error: selErr?.message || "Projet introuvable" }), { status: 404 });

    let outPath = null;
    const outputBucket = process.env.OUTPUT_BUCKET || "output-images";
    if (project.output_image_url) {
      try {
        const u = new URL(project.output_image_url);
        const parts = u.pathname.split("/");
        outPath = parts.slice(parts.indexOf(outputBucket) + 1).join("/");
      } catch (_) {}
    }
    if (!outPath) outPath = `outputs/${project.id}.jpg`;

    await supabaseAdmin.storage.from(outputBucket).remove([outPath]);

    const { error: delErr } = await supabase.from("projects").delete().eq("id", id);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
}

