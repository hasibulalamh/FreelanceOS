"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 " +
  "focus:ring-violet-500/20";

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 " +
  "text-sm font-medium text-white transition-colors hover:bg-violet-700 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function OAuthButtons({ providers }) {
  const [pending, setPending] = useState(null);
  if (!providers?.length) return null;

  const handle = async (id) => {
    setPending(id);
    await signIn(id, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handle(p.id)}
          disabled={pending !== null}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {pending === p.id ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Continue with {p.label}
        </button>
      ))}
    </div>
  );
}

export function LoginForm({ providers = [] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }
    // Successful JWT issuance — full navigation so server components pick
    // up the session cookie.
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <ErrorAlert message={error} />
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••••••"
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {providers.length > 0 ? (
        <>
          <div className="relative py-1 text-center">
            <span className="relative z-10 bg-white px-2 text-xs uppercase tracking-wide text-slate-400">
              or
            </span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" aria-hidden="true" />
          </div>
          <OAuthButtons providers={providers} />
        </>
      ) : null}
    </form>
  );
}

export function RegisterForm({ initialSetup = false, providers = [] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Registration failed.");
        setPending(false);
        return;
      }

      // Auto sign-in so initial setup ends on the dashboard.
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setDone(true);
        setPending(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please retry.");
      setPending(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
        <p className="text-sm text-slate-700">Account created. Please sign in.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {initialSetup ? (
        <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
          Initial setup — the first account created becomes the platform owner.
        </p>
      ) : null}
      <ErrorAlert message={error} />
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Hasibul Alam"
        />
      </div>
      <div>
        <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="At least 12 characters"
        />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? "Creating account…" : "Create account"}
      </button>
      {providers.length > 0 ? (
        <>
          <div className="relative py-1 text-center">
            <span className="relative z-10 bg-white px-2 text-xs uppercase tracking-wide text-slate-400">
              or
            </span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" aria-hidden="true" />
          </div>
          <OAuthButtons providers={providers} />
        </>
      ) : null}
    </form>
  );
}
