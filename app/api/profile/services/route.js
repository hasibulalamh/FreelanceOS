import { createCollectionHandlers } from "@/services/profile/collection-crud";
import { serviceCreateSchema } from "@/validators/profile";

const handlers = createCollectionHandlers({
  model: "service",
  label: "service",
  createSchema: serviceCreateSchema,
});

export const POST = handlers.create;
