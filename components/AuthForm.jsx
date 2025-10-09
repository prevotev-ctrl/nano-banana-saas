"use client";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ defaultTab = "login" }) {
  const [tab, setTab] = useState(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (tab === "login") {
        const data = await signIn(email, password);
        if (data?.session) router.replace("/dashboard");
      } else {
        const data = await signUp(email, password);
        if (data?.session) {
          router.replace("/dashboard");
        } else {
          setInfo("Inscription réussie. Vérifiez votre e-mail pour confirmer votre compte.");
        }
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto p-6 border rounded">
      <div className="flex gap-4 mb-4">
        <button
          className={`px-3 py-1 rounded ${tab === "login" ? "bg-black text-white" : "border"}`}
          onClick={() => setTab("login")}
        >
          Connexion
        </button>
        <button
          className={`px-3 py-1 rounded ${tab === "signup" ? "bg-black text-white" : "border"}`}
          onClick={() => setTab("signup")}
        >
          Inscription
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="border rounded p-2" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Mot de passe</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required className="border rounded p-2" />
        </label>
        <button disabled={loading} className="bg-black text-white px-4 py-2 rounded">
          {loading ? "En cours..." : tab === "login" ? "Se connecter" : "Créer un compte"}
        </button>
        {error && <div className="text-red-600">{error}</div>}
        {info && <div className="text-green-700">{info}</div>}
      </form>

      <div className="text-sm mt-4">
        {tab === "login" ? (
          <span>Pas de compte ? <Link href="/signup" className="underline">Inscrivez-vous</Link></span>
        ) : (
          <span>Déjà un compte ? <Link href="/login" className="underline">Connectez-vous</Link></span>
        )}
      </div>
    </div>
  );
}