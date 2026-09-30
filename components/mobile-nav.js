"use client";

import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

// Mobile/tablet top bar. The full sidebar is hidden below lg; this keeps
// navigation and sign-out reachable on small screens.
export function MobileNav({ user }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
          <Activity className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-slate-900">FreelanceOS</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="max-w-[140px] truncate text-xs text-slate-500">{user?.email}</span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
