"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Blocks,
  Briefcase,
  Sparkles,
  Megaphone,
  FileText,
  Users,
  FolderKanban,
  BarChart3,
  FlaskConical,
  Bell,
  Blocks as IntegrationsIcon,
  Settings,
  LogOut,
  Activity,
} from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/cn";

const NAV_SECTIONS = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/profile", label: "My Profile", icon: User },
      { href: "/platforms", label: "Platforms", icon: Blocks },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/gigs", label: "Gigs", icon: Megaphone },
      { href: "/proposals", label: "Proposals", icon: FileText },
      { href: "/portfolio", label: "Portfolio", icon: FolderKanban },
      { href: "/research", label: "Research", icon: FlaskConical },
    ],
  },
  {
    label: "AI Studio",
    items: [{ href: "/ai-studio", label: "AI Studio", icon: Sparkles }],
  },
  {
    label: "System",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/integrations", label: "Integrations", icon: IntegrationsIcon },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ user }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
          <Activity className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold text-slate-900">FreelanceOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label ?? `section-${i}`} className="mb-4">
            {section.label ? (
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-violet-50 text-violet-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <item.icon
                        className={cn("h-4 w-4", active ? "text-violet-600" : "text-slate-400")}
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
            {(user?.name ?? "U")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-900">{user?.name ?? "User"}</p>
            <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      </aside>
  );
}
