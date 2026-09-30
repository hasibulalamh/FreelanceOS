import { freelancerConfig, isConfigured } from "@/services/platforms/freelancer/config";
import { freelancerApiFetch, FreelancerApiError } from "@/services/platforms/freelancer/client";
import { buildAuthorizeUrl, exchangeCodeForTokens, refreshTokens } from "@/services/platforms/freelancer/oauth";

/**
 * Freelancer.com platform adapter.
 *
 * The ONLY platform in the catalog whose official public API FreelanceOS
 * integrates today (see services/platforms/catalog.js: OFFICIAL_API and OAUTH
 * are SUPPORTED). Every operation here goes through Freelancer's documented
 * endpoints with the user's own OAuth token — there is no scraping and no
 * automation beyond reading data the user can already see.
 *
 * Proposal submission stays MANUAL_ONLY by policy: the adapter deliberately
 * does not implement bid creation even though the official API permits it.
 */
export const freelancerAdapter = {
  slug: "freelancer",
  name: "Freelancer",

  isConfigured,

  /** @param {object} options see buildAuthorizeUrl */
  buildConnectUrl: buildAuthorizeUrl,

  exchangeCode: exchangeCodeForTokens,

  refresh: refreshTokens,

  /**
   * GET users/0.1/self — the connected user's Freelancer profile.
   * Returns a display-safe projection; raw API data is never persisted here.
   */
  async fetchSelf(accessToken) {
    const result = await freelancerApiFetch(accessToken, "users/0.1/self", {
      compact: true,
    });
    return {
      id: result.id ?? null,
      username: result.username ?? null,
      displayName: result.display_name ?? result.username ?? null,
      country: result.location?.country?.name ?? result.location_json?.country?.name ?? null,
      hourlyRate: result.hourly_rate ?? result.hourly_rate_json?.amount ?? null,
      currency: result.hourly_rate_json?.currency?.code ?? null,
      registrationCompleted: result.registration_completed ?? null,
      raw: result,
    };
  },

  /**
   * GET projects/0.1/projects/all — official job/project search.
   * Read-only passthrough (no persistence): Job storage arrives in Phase 11.
   */
  async searchProjects(accessToken, { query, limit = 10, offset = 0 }) {
    const result = await freelancerApiFetch(accessToken, "projects/0.1/projects/all", {
      query,
      limit,
      offset,
      // Compact projection keeps payloads small; full details come later
      // via the job analyzer (Phase 11) when the user picks a job.
      compact: true,
    });
    const projects = Array.isArray(result?.projects) ? result.projects : [];
    return {
      total: result?.total_count ?? projects.length,
      jobs: projects.map((project) => ({
        id: project.id ?? null,
        title: project.name ?? project.title ?? null,
        description: project.description ?? null,
        seoUrl: project.seo_url
          ? `${freelancerConfig.apiBaseUrl}/projects/${project.seo_url}`
          : null,
        budgetMinimum: project.budget?.minimum ?? null,
        budgetMaximum: project.budget?.maximum ?? null,
        currency: project.currency?.code ?? project.budget?.currency?.code ?? null,
        submittedAt: project.time_submitted ?? null,
        // job array holds category/job-type ids useful for keyword matching.
        jobCategoryIds: Array.isArray(project.job) ? project.job : [],
      })),
    };
  },
};

/** Thrown by routes when an operation needs a connected account. */
export { FreelancerApiError };
