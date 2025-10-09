"use client";
import AuthForm from "../../components/AuthForm";

export default function SignupPage() {
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Inscription</h1>
      <AuthForm defaultTab="signup" />
    </main>
  );
}

