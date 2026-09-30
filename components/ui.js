import { cn } from "@/lib/cn";

// Minimal server-safe UI primitives for the dashboard. Client interactivity
// lives in dedicated client components; these stay renderable on the server.

export function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const BADGE_TONES = {
  neutral: "bg-slate-100 text-slate-700",
  violet: "bg-violet-50 text-violet-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
};

export function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        BADGE_TONES[tone] ?? BADGE_TONES.neutral
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon ? (
          <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {Icon ? (
        <div className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
          <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? <p className="max-w-sm text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
