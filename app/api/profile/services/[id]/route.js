import { createCollectionHandlers } from "@/services/profile/collection-crud";
import { serviceUpdateSchema } from "@/validators/profile";

const handlers = createCollectionHandlers({
  model: "service",
  label: "service",
  updateSchema: serviceUpdateSchema,
});

export const PATCH = handlers.update;
export const DELETE = handlers.remove;
