import { createCollectionHandlers } from "@/services/profile/collection-crud";
import { skillCreateSchema } from "@/validators/profile";

const handlers = createCollectionHandlers({
  model: "skill",
  label: "skill",
  createSchema: skillCreateSchema,
  updateSchema: undefined,
  manualOnly: true,
});

export const POST = handlers.create;
