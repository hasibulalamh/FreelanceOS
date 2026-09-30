import Link from "next/link";
import {
  Activity,
  Sparkles,
  FileText,
  ShieldCheck,
  Workflow,
  ArrowRight,
  Check,
} from "lucide-react";

import { Card, Badge } from "@/components/ui";

export const metadata = {
  title: "FreelanceOS — One workspace for your entire freelance business",
  description:
    "Optimize your freelance profiles, analyze opportunities, create platform-specific content, and turn your portfolio into a smarter AI-powered workflow.",
};

const PLATFORMS = ["Fiverr", "Upwork", "Freelancer", "PeoplePerHour", "Guru", "Contra"];

const AI_STUDIO_ITEMS = [
  { icon: Sparkles, title: "Profile Optimizer", note: "Platform-specific titles, overviews and keyword placement." },
  { icon: Sparkles, title: "Keyword Research", note: "Relevance and intent analysis — clearly labeled, no fake volumes." },
  { icon: Sparkles, title: "Gig Generator", note: "Original titles, packages, FAQ and tags from your portfolio." },
  { icon: FileText, title: "Proposal Generator", note: "Job analysis → portfolio matching → personalized draft → review." },
];

const WORKFLOW = [
  { step: "1", title: "Sync portfolio", note: "Your portfolio API is the single source of truth." },
  { step: "2", title: "Pick a platform", note: "Capability-aware: no invented APIs, no fake claims." },
  { step: "3", title: "Analyze & generate", note: "Keywords, profiles, gigs and proposals from your data." },
  { step: "4", title: "Review & approve", note: "Human approval stays in the loop before anything ships." },
];

const SECURITY_POINTS = [
  "Marketplace passwords and cookies are never stored",
  "No unauthorized scraping, CAPTCHA or anti-bot bypass",
  "Gemini API keys stay server-side, never in the browser",
  "Final Create / Submit actions always remain user-controlled",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Activity className="h-4.5 w-4.5 h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold text-slate-900">FreelanceOS</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
        <Badge tone="violet">Personal AI freelance operating system</Badge>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          One workspace for your entire freelance business.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Optimize your freelance profiles, analyze opportunities, create platform-specific
          content, and turn your portfolio into a smarter AI-powered workflow.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Get Started
          </Link>
          <Link
            href="#ai-studio"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Explore AI Studio
          </Link>
        </div>

        {/* Dashboard preview — stylized, clearly a visual, not a fake claim */}
        <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            <span className="h-2.5 w-2.5 animated pulse rounded-full bg-slate-200" />
            <span className="ml-3 text-xs text-slate-400">app.hasibulalam.com</span>
          </div>
          <div className="grid grid-cols-4 gap-4 p-6 text-left">
            {["Profile health", "Portfolio sync", "AI usage", "Opportunities"].map((label, i) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {["92%", "Live", "68%", "24"][i]}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 bg-white px-6 py-4 text-left text-xs text-slate-400">
            Illustrative preview — real metrics appear only once your data is connected.
          </div>
 </div>
      </section>

      {/* Platform support */}
      <section className="border-y border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
            Platform support
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((name) => (
              <span
                key={name}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mx-auto mt-4 max-w-xl text-center text-xs text-slate-500">
            Capability-aware by design — each platform exposes only what it officially supports.
          </p>
        </div>
      </section>

      {/* AI Studio */}
      <section id="ai-studio" className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold text-slate-900">AI Studio</h2>
          <p className="mt-2 text-slate-600">
            Gemini-powered tools that generate original content from your verified portfolio —
            never from copied competitor material.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI_STUDIO_ITEMS.map((item) => (
            <Card key={item.title} className="p-5">
              <item.icon className="h-5 w-5 text-violet-600" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.note}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="border-y border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-violet-600" aria-hidden="true" />
            <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((w) => (
              <Card key={w.step} className="p-5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700">
                  {w.step}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{w.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{w.note}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-violet-600" aria-hidden="true" />
              <h2 className="text-2xl font-semibold text-slate-900">Security first</h2>
            </div>
            <ul className="mt-6 space-y-3">
              {SECURITY_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-900">Human approval, always</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              FreelanceOS generates and prepares. You review, approve and submit. Nothing is
              ever posted, published or sent to a marketplace without your explicit action.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} FreelanceOS · hasibulalam.com</span>
          <span>Built as a personal freelance command center</span>
        </div>
      </footer>
    </div>
  );
}
