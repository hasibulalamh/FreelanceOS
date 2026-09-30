import { PrismaClient } from "@prisma/client";

import { PLATFORMS, validateCatalog } from "../services/platforms/catalog.js";

const prisma = new PrismaClient();

/**
 * Seeds the platform catalog + capability matrix from the code-level catalog.
 * Upserts only: re-running never deletes platform rows or user accounts.
 */
async function main() {
  const errors = validateCatalog();
  if (errors.length > 0) {
    throw new Error(`Catalog validation failed:\n${errors.join("\n")}`);
  }

  for (const platform of PLATFORMS) {
    const record = await prisma.platform.upsert({
      where: { slug: platform.slug },
      create: {
        slug: platform.slug,
        name: platform.name,
        websiteUrl: platform.websiteUrl,
      },
      update: {
        name: platform.name,
        websiteUrl: platform.websiteUrl,
      },
    });

    for (const [capability, entry] of Object.entries(platform.capabilities)) {
      await prisma.platformCapability.upsert({
        where: {
          platformId_capability: {
            platformId: record.id,
            capability,
          },
        },
        create: {
          platformId: record.id,
          capability,
          status: entry.status,
          notes: entry.notes,
        },
        update: {
          status: entry.status,
          notes: entry.notes,
        },
      });
    }
  }

  const counts = {
    platforms: await prisma.platform.count(),
    capabilities: await prisma.platformCapability.count(),
  };
  process.stdout.write(
    `Seeded ${counts.platforms} platforms, ${counts.capabilities} capabilities.\n`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
