/**
 * Platform capability catalog — the single source of truth for what each
 * freelance marketplace supports.
 *
 * RULES (from the product spec):
 *  - Never assume a capability. Every status must be defensible.
 *  - The UI derives ALL platform claims from these rows — no hardcoded
 *    "API available" badges for platforms that have no public API.
 *  - AUTOMATIC_SUBMISSION is NOT_SUPPORTED everywhere by policy: even where
 *    an official API could submit, FreelanceOS keeps the final action
 *    human-controlled. The status field is about what FreelanceOS allows.
 *
 * Statuses:
 *  SUPPORTED                  — implemented/possible today through official means
 *  NOT_SUPPORTED              — the platform provides no official mechanism
 *  USER_AUTH_REQUIRED         — official mechanism exists, needs user OAuth
 *  PLATFORM_APPROVAL_REQUIRED — official mechanism exists but requires the
 *                               platform to approve an application first
 *  MANUAL_ONLY                — user pastes/inserts content themselves
 */

export const CAPABILITIES = [
  "PROFILE_SYNC",
  "JOB_IMPORT",
  "GIG_MANAGEMENT",
  "PROPOSAL_MANAGEMENT",
  "KEYWORD_RESEARCH",
  "BROWSER_ASSISTANCE",
  "OFFICIAL_API",
  "OAUTH",
  "AUTOMATIC_SUBMISSION",
];

export const CAPABILITY_STATUS = [
  "SUPPORTED",
  "NOT_SUPPORTED",
  "USER_AUTH_REQUIRED",
  "PLATFORM_APPROVAL_REQUIRED",
  "MANUAL_ONLY",
];

/**
 * Keyword research and job analysis run inside FreelanceOS on user-provided
 * data, so they are SUPPORTED on every platform. Everything marketplace-
 * touching is per-platform truth below.
 */
const sharedInternal = {
  KEYWORD_RESEARCH: {
    status: "SUPPORTED",
    notes: "Runs on user-provided context; no marketplace data required.",
  },
  AUTOMATIC_SUBMISSION: {
    status: "NOT_SUPPORTED",
    notes: "Deliberately disabled platform-wide: the final Create/Submit action always stays with the user.",
  },
};

export const PLATFORMS = [
  {
    slug: "fiverr",
    name: "Fiverr",
    websiteUrl: "https://www.fiverr.com",
    capabilities: {
      ...sharedInternal,
      PROFILE_SYNC: {
        status: "NOT_SUPPORTED",
        notes: "Fiverr provides no public API for seller profiles.",
      },
      JOB_IMPORT: {
        status: "MANUAL_ONLY",
        notes: "Buyer-brief text can be pasted into the Job Analyzer; no official feed exists.",
      },
      GIG_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Gig Builder prepares content; the user publishes it in Fiverr's dashboard.",
      },
      PROPOSAL_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Offer sending stays manual in Fiverr's briefs interface.",
      },
      BROWSER_ASSISTANCE: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Only within Fiverr's terms; the extension never bypasses their controls.",
      },
      OFFICIAL_API: {
        status: "NOT_SUPPORTED",
        notes: "No public seller API is offered by Fiverr.",
      },
      OAUTH: {
        status: "NOT_SUPPORTED",
        notes: "No consumer OAuth flow exists for sellers.",
      },
    },
  },
  {
    slug: "upwork",
    name: "Upwork",
    websiteUrl: "https://www.upwork.com",
    capabilities: {
      ...sharedInternal,
      PROFILE_SYNC: {
        status: "USER_AUTH_REQUIRED",
        notes: "Upwork's official API can read profiles after the user authorizes an app.",
      },
      JOB_IMPORT: {
        status: "USER_AUTH_REQUIRED",
        notes: "Official jobs/search endpoints, gated behind user OAuth.",
      },
      GIG_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Upwork has no gig concept; proposals are prepared here, sent manually.",
      },
      PROPOSAL_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Cover letters are prepared by the Proposal Builder and submitted by the user.",
      },
      BROWSER_ASSISTANCE: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Upwork's terms are strict; assistance is limited to explicitly permitted contexts.",
      },
      OFFICIAL_API: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Upwork grants API access per application after review.",
      },
      OAUTH: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "OAuth 2 exists but requires an approved Upwork app first.",
      },
    },
  },
  {
    slug: "freelancer",
    name: "Freelancer",
    websiteUrl: "https://www.freelancer.com",
    capabilities: {
      ...sharedInternal,
      PROFILE_SYNC: {
        status: "USER_AUTH_REQUIRED",
        notes: "Public API exposes profile endpoints after user authorization.",
      },
      JOB_IMPORT: {
        status: "SUPPORTED",
        notes: "Official projects/list API is public and documented.",
      },
      GIG_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Project listings are managed in Freelancer's UI.",
      },
      PROPOSAL_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Bids are prepared here; submitting stays a user action.",
      },
      BROWSER_ASSISTANCE: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Assistance respects Freelancer's automation policy.",
      },
      OFFICIAL_API: {
        status: "SUPPORTED",
        notes: "Freelancer publishes an official public API with documented endpoints.",
      },
      OAUTH: {
        status: "SUPPORTED",
        notes: "Official OAuth 2 flow, self-service app creation.",
      },
    },
  },
  {
    slug: "peopleperhour",
    name: "PeoplePerHour",
    websiteUrl: "https://www.peopleperhour.com",
    capabilities: {
      ...sharedInternal,
      PROFILE_SYNC: {
        status: "NOT_SUPPORTED",
        notes: "No public API for freelancer profiles.",
      },
      JOB_IMPORT: {
        status: "MANUAL_ONLY",
        notes: "Proposal text is pasted into the Job Analyzer.",
      },
      GIG_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Offers are prepared here and published manually.",
      },
      PROPOSAL_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Proposals are sent from the user's PeoplePerHour account.",
      },
      BROWSER_ASSISTANCE: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Only within their terms of service.",
      },
      OFFICIAL_API: {
        status: "NOT_SUPPORTED",
        notes: "No public API is offered.",
      },
      OAUTH: {
        status: "NOT_SUPPORTED",
        notes: "No consumer OAuth flow.",
      },
    },
  },
  {
    slug: "guru",
    name: "Guru",
    websiteUrl: "https://www.guru.com",
    capabilities: {
      ...sharedInternal,
      PROFILE_SYNC: {
        status: "NOT_SUPPORTED",
        notes: "No public API for freelancer profiles.",
      },
      JOB_IMPORT: {
        status: "MANUAL_ONLY",
        notes: "Job text is pasted into the Job Analyzer.",
      },
      GIG_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Guru WorkRooms are managed in their UI.",
      },
      PROPOSAL_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Quotes are prepared here, submitted manually.",
      },
      BROWSER_ASSISTANCE: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Only within their terms of service.",
      },
      OFFICIAL_API: {
        status: "NOT_SUPPORTED",
        notes: "No public API is offered.",
      },
      OAUTH: {
        status: "NOT_SUPPORTED",
        notes: "No consumer OAuth flow.",
      },
    },
  },
  {
    slug: "contra",
    name: "Contra",
    websiteUrl: "https://contra.com",
    capabilities: {
      ...sharedInternal,
      PROFILE_SYNC: {
        status: "NOT_SUPPORTED",
        notes: "No public API for independent profiles at this time.",
      },
      JOB_IMPORT: {
        status: "MANUAL_ONLY",
        notes: "Opportunity text is pasted into the Job Analyzer.",
      },
      GIG_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Services are managed in Contra's UI.",
      },
      PROPOSAL_MANAGEMENT: {
        status: "MANUAL_ONLY",
        notes: "Outreach is sent from the user's Contra account.",
      },
      BROWSER_ASSISTANCE: {
        status: "PLATFORM_APPROVAL_REQUIRED",
        notes: "Only within their terms of service.",
      },
      OFFICIAL_API: {
        status: "NOT_SUPPORTED",
        notes: "No public API is offered.",
      },
      OAUTH: {
        status: "NOT_SUPPORTED",
        notes: "No consumer OAuth flow.",
      },
    },
  },
];

/** Validation used by tests and the seeder: no silent capability drift. */
export function validateCatalog() {
  const errors = [];
  for (const platform of PLATFORMS) {
    for (const capability of CAPABILITIES) {
      const entry = platform.capabilities[capability];
      if (!entry) {
        errors.push(`${platform.slug}: missing capability ${capability}`);
        continue;
      }
      if (!CAPABILITY_STATUS.includes(entry.status)) {
        errors.push(`${platform.slug}/${capability}: invalid status ${entry.status}`);
      }
      if (!entry.notes || entry.notes.length < 10) {
        errors.push(`${platform.slug}/${capability}: notes must explain the WHY`);
      }
    }
    if (platform.capabilities.AUTOMATIC_SUBMISSION.status !== "NOT_SUPPORTED") {
      errors.push(`${platform.slug}: AUTOMATIC_SUBMISSION must be NOT_SUPPORTED by policy`);
    }
  }
  return errors;
}
