"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const inputBucket = useMemo(() => process.env.NEXT_PUBLIC_INPUT_BUCKET || process.env.INPUT_BUCKET || "input-images", []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, created_at, input_image_url, output_image_url, prompt, status, user_id, payment_status, payment_amount")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setProjects(data || []);
    })();
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      if (files.length === 0) throw new Error("Ajoutez au moins une image d'entrée.");
      // Upload first image
      const file = files[0];
      const ext = file.name.split(".").pop();
      const path = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(inputBucket).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(inputBucket).getPublicUrl(path);
      const inputUrl = pub.publicUrl;

      // Create project with pending payment
      const { data: project, error: insErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          input_image_url: inputUrl,
          prompt,
          status: "pending",
          payment_status: "pending",
          payment_amount: 2.0,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // Create Stripe Checkout Session and redirect
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Création de session échouée");

      // Optimistically add project
      setProjects((prev) => [project, ...prev]);
      setPrompt("");
      setFiles([]);
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate(projectId) {
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Génération échouée");
      setProjects((prev) => [data, ...prev.filter((p) => p.id !== projectId)]);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer ce projet ?")) return;
    const res = await fetch("/api/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Suppression impossible");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <main className="p-6">Chargement...</main>;
  if (!user) return <main className="p-6">Non connecté</main>;

  return (
    <main className="max-w-4xl mx-auto p-6 grid gap-6">
      <section className="grid gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Prompt</span>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="border rounded p-2" />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Image d'entrée</span>
            <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="border rounded p-2" />
          </label>
          <button type="submit" disabled={submitting} className="bg-black text-white px-4 py-2 rounded">
            {submitting ? "Redirection vers Stripe..." : "Générer (2€)"}
          </button>
          {error && <div className="text-red-600">Erreur: {error}</div>}
        </form>
      </section>

      <section>
        <h2 className="text-xl font-medium mb-2">Mes projets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="border rounded p-2">
              <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</div>
              {p.output_image_url ? (
                <img src={p.output_image_url} alt="output" className="mt-2 border" />
              ) : (
                <div className="mt-2 text-sm">
                  {p.payment_status === "paid" ? (
                    p.status === "pending" ? (
                      <button onClick={() => handleGenerate(p.id)} className="bg-blue-600 text-white text-sm px-3 py-1 rounded">
                        Lancer la génération
                      </button>
                    ) : (
                      <span>En cours...</span>
                    )
                  ) : (
                    <span>Paiement en attente...</span>
                  )}
                </div>
              )}
              <div className="mt-2 flex justify-between items-center">
                <div className="text-xs truncate" title={p.prompt}>{p.prompt}</div>
                <button onClick={() => handleDelete(p.id)} className="text-red-600 text-sm">Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

