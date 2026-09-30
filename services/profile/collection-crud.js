import "server-only";

import { prisma } from "@/lib/prisma";
import { ok, fail, readJson } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getOwnedProfile, findOwnedRow } from "@/services/profile/access";
import { logActivity } from "@/lib/activity";

/**
 * Factory for CRUD handlers of profile child collections (skills, services,
 * certifications). The auth → ownership → validation flow is written once;
 * each collection supplies its model + schemas.
 *
 * Authorization boundary: rows are always looked up through
 * (id, profileId-of-session-user). A foreign id is indistinguishable from a
 * missing one (404 either way).
 *
 * `manualOnly` collections (skills) refuse mutations on PORTFOLIO-sourced
 * rows: those are replaced by portfolio sync and must be edited at the
 * source, not here.
 *
 * Update semantics come from the validators: absent key = untouched,
 * empty string = clear nullable column.
 */
export function createCollectionHandlers({ model, label, createSchema, updateSchema, manualOnly = false }) {
  async function requireContext() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { unauthorized: true };
    const profile = await getOwnedProfile(userId);
    return { userId, profile };
  }

  function guardManualOnly(row) {
    if (manualOnly && row.source === "PORTFOLIO") {
      return fail(
        "This row is managed by portfolio sync — edit it at the source or add a manual entry instead",
        403
      );
    }
    return null;
  }

  async function create(request) {
    const ctx = await requireContext();
    if (ctx.unauthorized) return fail("Unauthorized", 401);

    const body = await readJson(request);
    if (body === null) return fail("Invalid JSON body");

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return fail(`Invalid ${label} data`, 400, parsed.error.flatten().fieldErrors);
    }

    try {
      const row = await prisma[model].create({
        data: { ...parsed.data, profileId: ctx.profile.id, source: "MANUAL" },
      });
      await logActivity(ctx.userId, `${label}.created`, "profile", { id: row.id });
      return ok({ [singular(model)]: row }, { status: 201 });
    } catch (error) {
      // Unique constraint (e.g. two skills with the same name on a profile).
      if (error?.code === "P2002") {
        return fail(`A ${label} with this name already exists`, 409);
      }
      console.error(`${label} create failed`, error);
      return fail("Internal server error", 500);
    }
  }

  async function update(request, context) {
    const ctx = await requireContext();
    if (ctx.unauthorized) return fail("Unauthorized", 401);

    const { id } = await context.params;
    const row = await findOwnedRow(model, ctx.profile.id, id);
    if (!row) return fail(`${label} not found`, 404);

    const blocked = guardManualOnly(row);
    if (blocked) return blocked;

    const body = await readJson(request);
    if (body === null) return fail("Invalid JSON body");

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(`Invalid ${label} data`, 400, parsed.error.flatten().fieldErrors);
    }

    try {
      const updated = await prisma[model].update({ where: { id: row.id }, data: parsed.data });
      await logActivity(ctx.userId, `${label}.updated`, "profile", { id: row.id });
      return ok({ [singular(model)]: updated });
    } catch (error) {
      if (error?.code === "P2002") {
        return fail(`A ${label} with this name already exists`, 409);
      }
      console.error(`${label} update failed`, error);
      return fail("Internal server error", 500);
    }
  }

  async function remove(request, context) {
    const ctx = await requireContext();
    if (ctx.unauthorized) return fail("Unauthorized", 401);

    const { id } = await context.params;
    const row = await findOwnedRow(model, ctx.profile.id, id);
    if (!row) return fail(`${label} not found`, 404);

    const blocked = guardManualOnly(row);
    if (blocked) return blocked;

    await prisma[model].delete({ where: { id: row.id } });
    await logActivity(ctx.userId, `${label}.deleted`, "profile", { id: row.id });
    return ok({ deleted: true });
  }

  return { create, update, remove };
}

function singular(model) {
  return model.replace(/s$/, "");
}
