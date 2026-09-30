import { createServer } from "node:http";

/**
 * Mock portfolio API for integration testing of the sync service.
 * Mirrors the real backend: same envelope { data, message, errors } and the
 * same resource field names (verified against app/Http/Resources/*).
 *
 * Control endpoints:
 *   POST /__mutate  — bump a mutation counter that changes hero.heading
 *   POST /__reset   — clear the mutation counter
 *
 * Run: node tests/mock/portfolio-api.mjs   (listens on :4401)
 */

let mutations = 0;

const payloads = {
  "/api/hero": {
    id: 1,
    name: "Hasibul Alam",
    heading: "Full-Stack Developer",
    subheading: "I build web products end to end.",
    roles: ["Developer"],
    tech_badges: [],
    is_available: true,
  },
  "/api/about": {
    id: 1,
    bio_paragraph_1: "I am a full-stack developer from Dhaka.",
    bio_paragraph_2: "I specialize in Laravel, Next.js and PostgreSQL.",
    image_path: "about/portrait.png",
    image_alt: "Portrait",
    stats: [],
  },
  "/api/contact-info": {
    id: 1,
    email: "hello@hasibulalam.com",
    phone: "+8801000000000",
    location: "Dhaka, Bangladesh",
    calendly_link: null,
    whatsapp_number: null,
  },
  "/api/skills": [
    {
      id: 1,
      name: "Backend",
      order: 1,
      skills: [
        { id: 1, skill_category_id: 1, name: "Laravel", icon: null, icon_slug: "laravel", logo_type: "library", logo_url: null, order: 1 },
        { id: 2, skill_category_id: 1, name: "PostgreSQL", icon: null, icon_slug: "postgresql", logo_type: "library", logo_url: null, order: 2 },
      ],
    },
    {
      id: 2,
      name: "Frontend",
      order: 2,
      skills: [
        { id: 3, skill_category_id: 2, name: "React", icon: null, icon_slug: "react", logo_type: "library", logo_url: null, order: 1 },
      ],
    },
  ],
  "/api/projects": [
    {
      id: 7,
      title: "E-commerce Platform",
      slug: "e-commerce-platform",
      image_path: "projects/shop.png",
      image_alt: "Shop screenshot",
      tags: ["Laravel", "Vue", "MySQL"],
      github_url: "https://github.com/hasibul/e-commerce",
      live_url: "https://shop.example.com",
      is_featured: true,
      order: 1,
    },
    {
      id: 8,
      title: "Job Portal",
      slug: "job-portal",
      image_path: "projects/jobs.png",
      image_alt: "Job portal screenshot",
      tags: ["Next.js", "PostgreSQL"],
      github_url: null,
      live_url: "https://jobs.example.com",
      is_featured: false,
      order: 2,
    },
  ],
  "/api/timeline": [
    {
      id: 1,
      type: "experience",
      institute_or_company: "TechNova Ltd",
      subject_or_role: "Senior Backend Developer",
      start_year: "2022",
      end_year: null,
      year_range: "2022 — Present",
      description: "Leading API development.",
      order: 1,
      year: null,
      title: null,
      company: null,
    },
    {
      id: 2,
      type: "education",
      institute_or_company: "University of Dhaka",
      subject_or_role: "BSc in Computer Science",
      start_year: "2016",
      end_year: "2020",
      year_range: "2016 — 2020",
      description: null,
      order: 2,
      year: null,
      title: null,
      company: null,
    },
  ],
  "/api/testimonials": [
    {
      id: 1,
      quote: "Delivered ahead of schedule with excellent quality.",
      author_name: "Jane Doe",
      author_role: "CTO, ExampleCorp",
      avatar_path: null,
      avatar_alt: null,
      order: 1,
    },
  ],
};

/** Mutating the hero heading simulates the owner editing their portfolio. */
function mutatePayload(data) {
  if (typeof data === "object" && data !== null && "heading" in data) {
    return { ...data, heading: `${data.heading} (v${mutations + 1})` };
  }
  return data;
}

const server = createServer((request, response) => {
  const path = request.url.split("?")[0];

  if (path === "/__mutate") {
    mutations += 1;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: { mutations }, message: "OK", errors: null }));
    return;
  }
  if (path === "/__reset") {
    mutations = 0;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: null, message: "OK", errors: null }));
    return;
  }

  const payload = payloads[path];
  if (!payload) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: null, message: "Not found", errors: null }));
    return;
  }

  const data = mutations > 0 ? mutatePayload(payload) : payload;
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ data, message: "OK", errors: null }));
});

server.listen(4401, () => {
  process.stdout.write("Mock portfolio API listening on http://localhost:4401\n");
});
