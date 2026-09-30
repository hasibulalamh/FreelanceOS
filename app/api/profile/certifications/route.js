import { createCollectionHandlers } from "@/services/profile/collection-crud";
import { certificationCreateSchema } from "@/validators/profile";

const handlers = createCollectionHandlers({
  model: "certification",
  label: "certification",
  createSchema: certificationCreateSchema,
});

export const POST = handlers.create;
