"use client";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b">
      <Link href="/" className="font-semibold">Nano Banana SaaS</Link>
      <nav className="flex items-center gap-3">
        <Link href="/dashboard" className="underline">Dashboard</Link>
        {user ? (
          <>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button onClick={signOut} className="border px-3 py-1 rounded">Se déconnecter</button>
          </>
        ) : (
          <>
            <Link href="/login" className="border px-3 py-1 rounded">Connexion</Link>
            <Link href="/signup" className="bg-black text-white px-3 py-1 rounded">Inscription</Link>
          </>
        )}
      </nav>
    </header>
  );
}

