import { describe, expect, it } from "vitest";

import {
  normalizeSkills,
  normalizeProjects,
  normalizeTimeline,
  normalizeTestimonials,
  normalizeIdentity,
  hashPayload,
  TIMELINE_TYPE,
} from "@/services/portfolio/normalize";

describe("normalizeSkills", () => {
  it("flattens category-nested skills", () => {
    const raw = [
      {
        id: 1,
        name: "Backend",
        skills: [
          { id: 1, name: "Laravel" },
          { id: 2, name: "PostgreSQL" },
        ],
      },
      {
        id: 2,
        name: "Frontend",
        skills: [{ id: 3, name: "React" }],
      },
    ];
    expect(normalizeSkills(raw)).toEqual([
      { name: "Laravel", category: "Backend" },
      { name: "PostgreSQL", category: "Backend" },
      { name: "React", category: "Frontend" },
    ]);
  });

  it("drops empty names and non-array input", () => {
    expect(normalizeSkills([{ name: "X", skills: [{ name: "  " }] }])).toEqual([]);
    expect(normalizeSkills(null)).toEqual([]);
    expect(normalizeSkills("nope")).toEqual([]);
  });
});

describe("normalizeProjects", () => {
  it("maps the card projection fields", () => {
    const raw = [
      {
        id: 7,
        title: "E-commerce Platform",
        slug: "e-commerce-platform",
        image_path: "projects/shop.png",
        image_alt: "Shop screenshot",
        tags: ["Laravel", "Vue", "MySQL"],
        github_url: "https://github.com/x/y",
        live_url: "https://shop.example.com",
        is_featured: true,
        order: 1,
      },
    ];
    expect(normalizeProjects(raw)).toEqual([
      {
        title: "E-commerce Platform",
        slug: "e-commerce-platform",
        description: null,
        technologies: ["Laravel", "Vue", "MySQL"],
        liveUrl: "https://shop.example.com",
        repoUrl: "https://github.com/x/y",
        imageUrl: "projects/shop.png",
        featured: true,
      },
    ]);
  });

  it("drops rows without a title", () => {
    expect(normalizeProjects([{ title: "" }, null]).length).toBe(0);
  });
});

describe("normalizeTimeline", () => {
  it("splits experience and education by type", () => {
    const raw = [
      {
        id: 1,
        type: "experience",
        institute_or_company: "TechNova Ltd",
        subject_or_role: "Senior Backend Developer",
        start_year: "2022",
        end_year: null,
        year_range: "2022 — Present",
        description: "Leading API development.",
      },
      {
        id: 2,
        type: "education",
        institute_or_company: "University of Dhaka",
        subject_or_role: "BSc in CSE",
        start_year: "2016",
        end_year: "2020",
        year_range: "2016 — 2020",
        description: null,
      },
    ];

    const result = normalizeTimeline(raw);
    const experience = result.find((r) => r.type === TIMELINE_TYPE.EXPERIENCE);
    const education = result.find((r) => r.type === TIMELINE_TYPE.EDUCATION);

    expect(experience.company).toBe("TechNova Ltd");
    expect(experience.title).toBe("Senior Backend Developer");
    expect(experience.isCurrent).toBe(true);
    expect(education.institution).toBe("University of Dhaka");
    expect(education.degree).toBe("BSc in CSE");
    expect(education.isCurrent).toBe(false);
  });

  it("defaults unknown types to experience", () => {
    const result = normalizeTimeline([{ type: "mystery", institute_or_company: "X", subject_or_role: "Y" }]);
    expect(result[0].type).toBe(TIMELINE_TYPE.EXPERIENCE);
  });
});

describe("normalizeTestimonials", () => {
  it("maps author and quote and drops incomplete rows", () => {
    const raw = [
      { id: 1, quote: "Great work.", author_name: "Jane Doe", author_role: "CTO" },
      { id: 2, quote: "", author_name: "No Quote" },
      { id: 3, quote: "Fine.", author_name: "" },
    ];
    const result = normalizeTestimonials(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ authorName: "Jane Doe", authorRole: "CTO", quote: "Great work." });
  });
});

describe("normalizeIdentity", () => {
  it("joins bio paragraphs and maps hero fields", () => {
    const hero = { name: "Hasibul Alam", heading: "Full-Stack Developer", subheading: "I build things" };
    const about = { bio_paragraph_1: "Paragraph one.", bio_paragraph_2: "Paragraph two." };
    const contact = { location: "Dhaka, Bangladesh" };

    const identity = normalizeIdentity(hero, about, contact);
    expect(identity.fullName).toBe("Hasibul Alam");
    expect(identity.professionalTitle).toBe("Full-Stack Developer");
    expect(identity.bio).toBe("Paragraph one.\n\nParagraph two.");
    expect(identity.location).toBe("Dhaka, Bangladesh");
  });

  it("returns nulls when sections are missing", () => {
    const identity = normalizeIdentity(null, null, null);
    expect(identity.fullName).toBeNull();
    expect(identity.bio).toBeNull();
  });
});

describe("hashPayload", () => {
  it("is order-insensitive for object keys and array order", async () => {
    const a = await hashPayload({ skills: ["A", "B"], identity: { name: "X" } });
    const b = await hashPayload({ identity: { name: "X" }, skills: ["A", "B"] });
    expect(a).toBe(b);
  });

  it("changes when content changes", async () => {
    const a = await hashPayload({ skills: ["A"] });
    const b = await hashPayload({ skills: ["B"] });
    expect(a).not.toBe(b);
  });
});
