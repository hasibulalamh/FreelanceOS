/**
 * Normalizes portfolio API payloads into the FreelanceOS database shapes.
 *
 * This module is intentionally PURE: no fetch, no Prisma, no env access.
 * That keeps it unit-testable in isolation and lets the portfolio API be
 * swapped later without touching the AI layer (the spec's modularity rule).
 *
 * Field mappings are verified against the real backend resources
 * (portfolio-backend app/Http/Resources/*), not guessed names.
 */

// Timeline item types the portfolio emits; type decides local mapping.
export const TIMELINE_TYPE = Object.freeze({
  EXPERIENCE: "experience",
  EDUCATION: "education",
});

/**
 * @param {unknown} raw portfolio /api/skills payload:
 *   [{ id, name, skills: [{ id, name, icon_slug, ... }] }]
 * @returns {{ name, category }[]} flat skill list
 */
export function normalizeSkills(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((category) =>
      Array.isArray(category?.skills)
        ? category.skills.map((skill) => ({
            name: String(skill?.name ?? "").trim(),
            category: category?.name ? String(category.name).trim() : null,
          }))
        : []
    )
    .filter((skill) => skill.name.length > 0);
}

/**
 * @param {unknown} raw portfolio /api/projects payload (card projection):
 *   [{ id, title, slug, image_path, image_alt, tags, github_url,
 *      live_url, is_featured, order }]
 * @returns {{ title, slug, description, technologies, liveUrl, repoUrl,
 *             imageUrl, featured }[]}
 */
export function normalizeProjects(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((project) => ({
    title: String(project?.title ?? "").trim(),
    slug: project?.slug ? String(project.slug) : null,
    // Card projection carries no description — tags stand in for the short
    // description until a detail fetch is added.
    description: null,
    technologies: Array.isArray(project?.tags)
      ? project.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
    liveUrl: project?.live_url ? String(project.live_url) : null,
    repoUrl: project?.github_url ? String(project.github_url) : null,
    imageUrl: project?.image_path ? String(project.image_path) : null,
    featured: Boolean(project?.is_featured),
  })).filter((project) => project.title.length > 0);
}

/**
 * @param {unknown} raw portfolio /api/timeline payload:
 *   [{ id, type, institute_or_company, subject_or_role, start_year,
 *      end_year, year_range, description, order }]
 * @returns {{ company, title, description, isCurrent, source }[]  (experience)
 *            { institution, degree, field, description, source }[] (education)
 */
export function normalizeTimeline(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    type: item?.type === TIMELINE_TYPE.EDUCATION ? TIMELINE_TYPE.EDUCATION : TIMELINE_TYPE.EXPERIENCE,
    // Experience shape
    company: item?.institute_or_company ? String(item.institute_or_company) : null,
    title: item?.subject_or_role ? String(item.subject_or_role) : null,
    // Education shape
    institution: item?.institute_or_company ? String(item.institute_or_company) : null,
    degree: item?.subject_or_role ? String(item.subject_or_role) : null,
    field: null,
    // Portfolio years are plain strings ("2019"), not dates — stored as text
    // provenance would lose ordering, so keep them in description context.
    description: [item?.year_range, item?.description].filter(Boolean).join(" — ") || null,
    isCurrent: !item?.end_year,
  }));
}

/**
 * @param {unknown} raw portfolio /api/testimonials payload:
 *   [{ id, quote, author_name, author_role, avatar_path, avatar_alt, order }]
 */
export function normalizeTestimonials(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    authorName: String(item?.author_name ?? "").trim(),
    authorRole: item?.author_role ? String(item.author_role) : null,
    quote: String(item?.quote ?? "").trim(),
  })).filter((item) => item.authorName.length > 0 && item.quote.length > 0);
}

/**
 * @param {unknown} hero portfolio /api/hero payload
 * @param {unknown} about portfolio /api/about payload
 * @param {unknown} contact portfolio /api/contact-info payload
 * @returns {{ fullName, professionalTitle, bio, summary, location,
 *             portfolioUrl, avatarUrl }}
 */
export function normalizeIdentity(hero, about, contact) {
  const bio = [about?.bio_paragraph_1, about?.bio_paragraph_2]
    .filter(Boolean)
    .join("\n\n") || null;

  return {
    fullName: hero?.name ?? null,
    professionalTitle: hero?.heading ?? null,
    bio,
    summary: hero?.subheading ?? null,
    location: contact?.location ?? null,
    portfolioUrl: null, // filled by the service from the configured base URL
    avatarUrl: about?.image_path ?? null,
  };
}

/**
 * Computes a stable content hash used to detect portfolio changes without
 * re-running the whole write pipeline. SHA-256 via Web Crypto (available in
 * Node 18+ and Edge runtimes alike).
 *
 * Keys are sorted recursively so equivalent payloads hash identically even
 * if property order differed.
 * @param {unknown} payload any JSON-serializable sync payload
 * @returns {Promise<string>} hex digest
 */
export async function hashPayload(payload) {
  const stable = JSON.stringify(sortKeysDeep(payload));
  const bytes = new TextEncoder().encode(stable);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep(value[key])])
    );
  }
  return value;
}
