import { redirect } from "next/navigation";
import { Command } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { oauthProviders } from "@/lib/config";
import { LoginForm, RegisterForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

const PROVIDER_LABELS = {
  google: { id: "google", label: "Google" },
  github: { id: "github", label: "GitHub" },
};

// The login page doubles as initial setup: with zero users in the database it
// renders the owner-account creation form, afterwards the sign-in form.
export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  const userCount = await prisma.user.count();
  const providers = Object.keys(oauthProviders)
    .filter((key) => oauthProviders[key])
    .map((key) => PROVIDER_LABELS[key])
    .filter(Boolean);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600">
            <Command className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">FreelanceOS</h1>
          <p className="mt-1 text-sm text-slate-600">Your freelance command center</p>
        </div>
        {userCount === 0 ? (
          <RegisterForm initialSetup providers={providers} />
        ) : (
          <LoginForm providers={providers} />
        )}
      </div>
    </div>
  );
}
