import { z } from "zod";
import { WorkflowDefSchema } from "./types";

export const CreateWorkflowSchema = WorkflowDefSchema.omit({ id: true });
export const UpdateWorkflowSchema = WorkflowDefSchema.partial().omit({ id: true });

export const BatchUploadMetaSchema = z.object({
  items: z.array(
    z.object({
      index: z.number(),
      label: z.string(),
    })
  ),
});
