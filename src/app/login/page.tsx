"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/questions");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 tracking-[0.15em] uppercase text-white">
          Red Light
        </h1>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-10 tracking-[0.15em] uppercase text-red">
          District
        </h1>

        <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-divider">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-platinum mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg border border-divider rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-platinum mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-bg border border-divider rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red focus:border-transparent transition-all"
              />
            </div>
            {error && (
              <p className="text-red text-sm animate-fade-in">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-red text-white font-semibold rounded-lg hover:bg-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
