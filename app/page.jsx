import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6 grid gap-4">
      <h1 className="text-3xl font-semibold">Nano Banana SaaS</h1>
      <p className="text-gray-600">Générez des images à partir de vos prompts. Créez un compte pour accéder au dashboard et gérer vos projets.</p>
      <div className="flex gap-3">
        <Link href="/signup" className="bg-black text-white px-4 py-2 rounded">Commencer</Link>
        <Link href="/login" className="border px-4 py-2 rounded">J'ai déjà un compte</Link>
      </div>
    </main>
  );
}