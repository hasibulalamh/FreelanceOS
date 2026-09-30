import "server-only";

import { prisma } from "@/lib/prisma";
import { serverConfig } from "@/lib/config";
import { fetchPortfolioData, PortfolioApiError } from "@/services/portfolio/client";
import {
  normalizeSkills,
  normalizeProjects,
  normalizeTimeline,
  normalizeTestimonials,
  normalizeIdentity,
  hashPayload,
  TIMELINE_TYPE,
} from "@/services/portfolio/normalize";

/**
 * Portfolio Sync Service
 *
 * Flow: Portfolio API → fetch → normalize → change detection → write.
 *
 * Sync semantics:
 *  - PORTFOLIO-sourced rows are replaced wholesale on each sync (delete +
 *  recreate in a transaction): the portfolio is the source of truth and the
 *  payloads are small, so replace beats diffing.
 *  - MANUAL rows (added by the user inside FreelanceOS) are preserved —
 *  new rows are always created with source MANUAL by the profile UI.
 */
export async function syncPortfolio(userId) {
  const baseUrl = serverConfig.portfolioApiUrl;
  if (!baseUrl) {
    return {
      status: "NOT_CONFIGURED",
      message:
        "PORTFOLIO_API_URL is not set. Add it to .env to enable synchronization.",
    };
  }

  try {
    const [hero, about, contact, skills, projects, timeline, testimonials] =
      await Promise.all([
        fetchPortfolioData(baseUrl, "/api/hero"),
        fetchPortfolioData(baseUrl, "/api/about"),
        fetchPortfolioData(baseUrl, "/api/contact-info"),
        fetchPortfolioData(baseUrl, "/api/skills"),
        fetchPortfolioData(baseUrl, "/api/projects"),
        fetchPortfolioData(baseUrl, "/api/timeline"),
        fetchPortfolioData(baseUrl, "/api/testimonials"),
      ]);

    const identity = normalizeIdentity(hero, about, contact);
    const normalized = {
      identity: { ...identity, portfolioUrl: baseUrl },
      skills: normalizeSkills(skills),
      projects: normalizeProjects(projects),
      timeline: normalizeTimeline(timeline),
      testimonials: normalizeTestimonials(testimonials),
    };

    const syncHash = await hashPayload(normalized);

    const result = await prisma.$transaction(async (tx) => {
      // Upsert the profile row first; everything else hangs off it.
      const profile = await tx.profile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      // Skip the write phase entirely when the portfolio payload is
      // byte-identical to the last sync (cheap change detection).
      if (profile.lastSyncHash === syncHash) {
        return { status: "UNCHANGED", changed: false };
      }

      await writeNormalizedData(tx, profile.id, normalized);

      await tx.profile.update({
        where: { id: profile.id },
        data: {
          ...identityFields(normalized.identity),
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
          lastSyncHash: syncHash,
        },
      });
      return { status: "SYNCED", changed: true };
    });

    return {
      status: result.status,
      message:
        result.status === "UNCHANGED"
          ? "Portfolio data unchanged since last sync."
          : "Portfolio synchronized successfully.",
      counts: {
        skills: normalized.skills.length,
        projects: normalized.projects.length,
        experiences: normalized.timeline.filter((t) => t.type === TIMELINE_TYPE.EXPERIENCE)
          .length,
        education: normalized.timeline.filter((t) => t.type === TIMELINE_TYPE.EDUCATION)
          .length,
        testimonials: normalized.testimonials.length,
      },
    };
  } catch (error) {
    // Any failure marks the profile as FAILED so the UI can surface it —
    // but never wipes previously synced data.
    await prisma.profile.updateMany({
      where: { userId },
      data: { syncStatus: "FAILED" },
    });

    if (error instanceof PortfolioApiError) {
      return { status: "FAILED", message: error.message };
    }
    console.error("portfolio sync failed", error);
    return { status: "FAILED", message: "Portfolio synchronization failed." };
  }
}

/** Updates only the columns the identity mapping produces. */
function identityFields(identity) {
  const fields = {};
  for (const key of [
    "fullName",
    "professionalTitle",
    "bio",
    "summary",
    "location",
    "portfolioUrl",
    "avatarUrl",
  ]) {
    // undefined means "leave untouched"; null is a legitimate new value when
    // the portfolio removed a field.
    if (identity[key] !== undefined) fields[key] = identity[key];
  }
  return fields;
}

/**
 * Replace PORTFOLIO-sourced rows, preserve MANUAL rows.
 * Runs deleteMany + createMany inside the caller's transaction.
 */
async function writeNormalizedData(tx, profileId, normalized) {
  // Skills / projects / testimonials share the same replace pattern.
  const replacements = [
    { model: tx.skill, rows: normalized.skills },
    { model: tx.project, rows: normalized.projects },
    { model: tx.testimonial, rows: normalized.testimonials },
  ];

  for (const { model, rows } of replacements) {
    await model.deleteMany({ where: { profileId, source: "PORTFOLIO" } });
    if (rows.length > 0) {
      await model.createMany({
        data: rows.map((row) => ({ ...row, profileId, source: "PORTFOLIO" })),
      });
    }
  }

  // Timeline items split into two tables depending on their type.
  const experiences = normalized.timeline.filter(
    (t) => t.type === TIMELINE_TYPE.EXPERIENCE
  );
  const education = normalized.timeline.filter(
    (t) => t.type === TIMELINE_TYPE.EDUCATION
  );

  await tx.experience.deleteMany({ where: { profileId, source: "PORTFOLIO" } });
  if (experiences.length > 0) {
    await tx.experience.createMany({
      data: experiences.map(({ type: _type, institution: _i, degree: _d, field: _f, ...rest }) => ({
        ...rest,
        profileId,
        source: "PORTFOLIO",
      })),
    });
  }

  await tx.education.deleteMany({ where: { profileId, source: "PORTFOLIO" } });
  if (education.length > 0) {
    await tx.education.createMany({
      data: education.map(({ type: _t, company: _c, title: _ti, isCurrent: _ic, ...rest }) => ({
        ...rest,
        profileId,
        source: "PORTFOLIO",
      })),
    });
  }
}
