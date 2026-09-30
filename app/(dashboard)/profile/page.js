import { Briefcase, GraduationCap, FolderKanban, Quote, UserRound } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serverConfig } from "@/lib/config";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { PortfolioSyncButton } from "@/components/portfolio-sync-button";
import { IdentityEditor } from "@/components/profile/identity-editor";
import { SkillsManager } from "@/components/profile/skills-manager";
import { ServicesManager } from "@/components/profile/services-manager";
import { CertificationsManager } from "@/components/profile/certifications-manager";

export const dynamic = "force-dynamic";

const SYNC_TONES = {
  SYNCED: "green",
  FAILED: "red",
  PENDING: "amber",
  SYNCING: "amber",
  NEVER_SYNCED: "neutral",
};

export default async function ProfilePage() {
  const session = await auth();
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    include: {
      skills: { orderBy: { name: "asc" } },
      services: { orderBy: { title: "asc" } },
      experiences: true,
      education: true,
      certifications: { orderBy: { name: "asc" } },
      projects: { orderBy: { featured: "desc" } },
      testimonials: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-600">
            Master professional data — synchronized from your portfolio, editable here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profile ? (
            <Badge tone={SYNC_TONES[profile.syncStatus] ?? "neutral"}>
              {profile.syncStatus.replace(/_/g, " ").toLowerCase()}
            </Badge>
          ) : null}
          <PortfolioSyncButton />
        </div>
      </header>

      {/* Identity */}
      <Card>
        <CardHeader
          title="Personal information"
          subtitle="Sourced from the portfolio hero, about and contact sections"
          action={<IdentityEditor profile={profile ?? {}} />}
        />
        {profile?.fullName || profile?.professionalTitle ? (
          <div className="grid grid-cols-1 gap-6 px-5 py-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-3">
              <div>
                <p className="text-lg font-medium text-slate-900">
                  {profile.fullName ?? "Name not set"}
                </p>
                <p className="text-sm text-slate-600">
                  {profile.professionalTitle ?? "Professional title not set"}
                </p>
              </div>
              {profile.summary ? (
                <p className="text-sm leading-6 text-slate-700">{profile.summary}</p>
              ) : null}
              {profile.bio ? (
                <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{profile.bio}</p>
              ) : null}
            </div>
            <dl className="space-y-2 text-sm">
              <Meta label="Location" value={profile.location} />
              <Meta label="Portfolio" value={serverConfig.portfolioPublicUrl} link />
              <Meta
                label="Last synced"
                value={
                  profile.lastSyncedAt ? new Date(profile.lastSyncedAt).toLocaleString() : "Never"
                }
              />
            </dl>
          </div>
        ) : (
          <EmptyState
            icon={UserRound}
            title="Profile not synchronized yet"
            description="Run a sync to pull your identity, bio and contact data from hasibulalam.com."
          />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Skills — synced rows are read-only; manual rows are editable */}
        <Card>
          <CardHeader
            title="Skills"
            subtitle={`${profile?.skills.length ?? 0} total · manual entries survive sync`}
          />
          <SkillsManager skills={profile?.skills ?? []} />
        </Card>

        {/* Services — the portfolio API has no services endpoint, so this
            stays manual by design. */}
        <Card>
          <CardHeader title="Services" subtitle="Manual entries — not part of the portfolio API" />
          <ServicesManager services={profile?.services ?? []} />
        </Card>

        {/* Certifications — also manual-only by design. */}
        <Card>
          <CardHeader title="Certifications" subtitle="Manual entries — not part of the portfolio API" />
          <CertificationsManager certifications={profile?.certifications ?? []} />
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader title="Experience" subtitle={`${profile?.experiences.length ?? 0} entries`} />
          {(profile?.experiences.length ?? 0) === 0 ? (
            <EmptyState icon={Briefcase} title="No experience yet" description="Sync the portfolio to import your timeline." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.experiences.map((exp) => (
                <li key={exp.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{exp.title}</p>
                      <p className="text-xs text-slate-600">{exp.company}</p>
                    </div>
                    {exp.isCurrent ? <Badge tone="green">current</Badge> : null}
                  </div>
                  {exp.description ? (
                    <p className="mt-1 text-xs leading-5 text-slate-600">{exp.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Education */}
        <Card>
          <CardHeader title="Education" subtitle={`${profile?.education.length ?? 0} entries`} />
          {(profile?.education.length ?? 0) === 0 ? (
            <EmptyState icon={GraduationCap} title="No education yet" description="Sync the portfolio to import your timeline." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {profile.education.map((edu) => (
                <li key={edu.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-900">{edu.degree}</p>
                  <p className="text-xs text-slate-600">{edu.institution}</p>
                  {edu.description ? (
                    <p className="mt-1 text-xs text-slate-500">{edu.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Projects */}
      <Card>
        <CardHeader title="Portfolio projects" subtitle={`${profile?.projects.length ?? 0} synchronized`} />
        {(profile?.projects.length ?? 0) === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Projects appear here after the first portfolio sync."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.projects.map((project) => (
              <li key={project.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{project.title}</p>
                  {project.featured ? <Badge tone="violet">featured</Badge> : null}
                </div>
                {project.technologies.length > 0 ? (
                  <p className="mt-1.5 text-xs text-slate-600">{project.technologies.join(" · ")}</p>
                ) : null}
                <div className="mt-2 flex gap-3 text-xs">
                  {project.liveUrl ? (
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700">
                      Live
                    </a>
                  ) : null}
                  {project.repoUrl ? (
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700">
                      Source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Testimonials */}
      <Card>
        <CardHeader title="Testimonials" subtitle={`${profile?.testimonials.length ?? 0} synchronized`} />
        {(profile?.testimonials.length ?? 0) === 0 ? (
          <EmptyState icon={Quote} title="No testimonials yet" description="Sync the portfolio to import client quotes." />
        ) : (
          <ul className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-2">
            {profile.testimonials.map((testimonial) => (
              <li key={testimonial.id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm leading-6 text-slate-700">“{testimonial.quote}”</p>
                <p className="mt-2 text-xs text-slate-500">
                  — {testimonial.authorName}
                  {testimonial.authorRole ? `, ${testimonial.authorRole}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Meta({ label, value, link = false }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-xs font-medium text-slate-800">
        {link && value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700">
            {value.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          value ?? "—"
        )}
      </dd>
    </div>
  );
}
