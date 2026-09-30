import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { AuthSessionProvider } from "@/components/session-provider";

// Server-side session gate: every route in this group requires an
// authenticated session, independent of any client-side checks.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AuthSessionProvider session={session}>
      <div className="flex min-h-screen bg-slate-50">
        <div className="hidden lg:block">
          <Sidebar user={session.user} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav user={session.user} />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthSessionProvider>
  );
}
