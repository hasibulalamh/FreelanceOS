import { createCollectionHandlers } from "@/services/profile/collection-crud";
import { certificationUpdateSchema } from "@/validators/profile";

const handlers = createCollectionHandlers({
  model: "certification",
  label: "certification",
  updateSchema: certificationUpdateSchema,
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
