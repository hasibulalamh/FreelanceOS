import { createCollectionHandlers } from "@/services/profile/collection-crud";
import { skillUpdateSchema } from "@/validators/profile";

const handlers = createCollectionHandlers({
  model: "skill",
  label: "skill",
  createSchema: undefined,
  updateSchema: skillUpdateSchema,
  manualOnly: true,
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
